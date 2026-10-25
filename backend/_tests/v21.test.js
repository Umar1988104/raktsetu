// v2.1 — referral links. Pure rules + routes with stand-in database calls.
const test = require("node:test");
const assert = require("node:assert/strict");

const vt = require.resolve("../middleware/verifyToken");
require.cache[vt] = {
  id: vt, filename: vt, loaded: true,
  exports: (req, res, next) => {
    const uid = req.headers["x-uid"];
    if (!uid) return res.status(401).json({ error: "no login" });
    req.user = { uid, email: "me@mail.com", emailVerified: true };
    next();
  },
};

const express = require("express");
const User = require("../models/User");
const Donor = require("../models/Donor");
const Card = require("../models/Card");
const ref = require("../utils/referral");
const { computeTrustScore, computeTrustTier } = require("../utils/trust");
const { serializePublicCard, serializeOwnCard } = require("../utils/serializers");
const { buildCardView } = require("../utils/cardView");
const { ALPHABET, generateCardId } = require("../utils/cardId");

// ---------------- pure ----------------
test("referral codes: 8 chars, safe alphabet, unique, not guessable from a counter", () => {
  const seen = new Set();
  for (let i = 0; i < 4000; i++) {
    const c = ref.generateReferralCode();
    assert.match(c, /^[2-9A-HJ-NP-Z]{8}$/);
    assert.ok([...c].every((ch) => ALPHABET.includes(ch)));
    seen.add(c);
  }
  assert.equal(seen.size, 4000);
});

test("normalizeReferralCode: forgiving about case, spaces and hyphens; rejects junk", () => {
  const c = ref.generateReferralCode();
  assert.equal(ref.normalizeReferralCode(c.toLowerCase()), c);
  assert.equal(ref.normalizeReferralCode(` ${c.slice(0, 4)}-${c.slice(4)} `), c);
  for (const bad of [null, undefined, "", "short", "ABCDEFGH1", "0OI1ABCD", "{$ne:1}", { $ne: "x" }, "A".repeat(40), "ABCD EFG!"]) {
    assert.equal(ref.normalizeReferralCode(bad), null, String(bad));
  }
});

test("trust bonus: +10 per invited donor who donated, capped at +20", () => {
  assert.equal(ref.referralTrustBonus(0), 0);
  assert.equal(ref.referralTrustBonus(1), 10);
  assert.equal(ref.referralTrustBonus(2), 20);
  assert.equal(ref.referralTrustBonus(50), 20);
  assert.equal(ref.referralTrustBonus(-3), 0);
  assert.equal(ref.referralTrustBonus("x"), 0);
  const donor = { verified: false, donationHistory: [] };
  assert.equal(computeTrustScore(donor, { referralCount: 0 }), 0);
  assert.equal(computeTrustScore(donor, { referralCount: 99 }), 20);
  assert.equal(computeTrustTier(donor, { referralCount: 0 }), "New");
  assert.equal(computeTrustTier(donor, { referralCount: 2 }), "Trusted");
  assert.equal(computeTrustTier(donor, undefined), "New");
});

test("canAcceptReferral: donors only, not guests, not the same phone", () => {
  const inviter = { role: "donor", isGuest: false, phone: "9876543210" };
  assert.equal(ref.canAcceptReferral(inviter, "9123456780"), true);
  assert.equal(ref.canAcceptReferral(inviter, "9876543210"), false);
  assert.equal(ref.canAcceptReferral({ ...inviter, role: "hospital" }, "9123456780"), false);
  assert.equal(ref.canAcceptReferral({ ...inviter, role: "seeker" }, "9123456780"), false);
  assert.equal(ref.canAcceptReferral({ ...inviter, isGuest: true }, "9123456780"), false);
  assert.equal(ref.canAcceptReferral(null, "9123456780"), false);
});

// ---------------- credit logic (stand-in DB) ----------------
const q = (result) => { const o = { select: () => o, populate: () => o, lean: () => o, then: (a, b) => Promise.resolve(result).then(a, b) }; return o; };
const log = { updates: [], filters: [] };

test("credit: once per invitee, only for the donor's own profile, inviter gets +1", async () => {
  log.updates = []; log.filters = [];
  Donor.find = (f) => { log.filters.push(f); return q([{ user: "U1" }, { user: "U2" }, { user: "U3" }]); };
  const already = new Set(["U2"]);
  User.findOneAndUpdate = (filter) => {
    assert.deepEqual(filter.referralCredited, { $ne: true });
    assert.deepEqual(filter.referredBy, { $ne: null });
    if (already.has(filter._id)) return q(null); // already credited or never invited
    already.add(filter._id);
    return q(filter._id === "U3" ? { referredBy: null } : { referredBy: "INVITER" });
  };
  User.updateOne = async (f, u) => { log.updates.push([f, u]); };
  assert.equal(await ref.creditReferralsForDonors(["d1", "d2", "d3"]), 1);
  assert.deepEqual(log.updates, [[{ _id: "INVITER" }, { $inc: { referralCount: 1 } }]]);
  assert.equal(log.filters[0].familyMemberId, null, "family-member donor profiles never count");
  // the same donation processed again changes nothing
  log.updates = [];
  assert.equal(await ref.creditReferralsForDonors(["d1"]), 0);
  assert.equal(log.updates.length, 0);
});

test("credit: a database error never breaks closing a request", async () => {
  Donor.find = () => { throw new Error("db down"); };
  const origError = console.error; console.error = () => {};
  assert.equal(await ref.creditReferralsForDonors(["d1"]), 0);
  console.error = origError;
});

// ---------------- routes ----------------
const cur = {};
const created = [];
User.findOne = (filter) => { cur.lastFindFilter = filter; return q(filter.firebaseUid ? cur.me : cur.inviter); };
User.create = async (data) => { created.push(data); return { ...data, _id: "NEWID", toObject() { return { ...data, _id: "NEWID" }; } }; };
User.countDocuments = async () => cur.signedUp ?? 0;
const authRoutes = require("../routes/auth");
const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
let server, base;
test.before(async () => { await new Promise((r) => (server = app.listen(0, r))); base = `http://localhost:${server.address().port}`; });
test.after(() => server.close());
test.beforeEach(() => { for (const k of Object.keys(cur)) delete cur[k]; created.length = 0; });
const call = async (method, path, { uid = "u", body } = {}) => {
  const res = await fetch(base + path, { method, headers: { "content-type": "application/json", ...(uid ? { "x-uid": uid } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, text, json: text ? JSON.parse(text) : null };
};
const GOOD = { name: "Asha Rao", phone: "9123456780", role: "donor" };
const CODE = ref.generateReferralCode();

test("register with a valid invite: stored as referredBy, never shown to the new user", async () => {
  cur.inviter = { _id: "INVITER", role: "donor", isGuest: false, phone: "9876543210" };
  const r = await call("POST", "/api/auth/register", { body: { ...GOOD, ref: CODE.toLowerCase() } });
  assert.equal(r.status, 201);
  assert.equal(created[0].referredBy, "INVITER");
  assert.equal(cur.lastFindFilter.referralCode, CODE, "looked up by the normalised code");
  assert.ok(!r.text.includes("INVITER") && !r.text.includes("referredBy") && !r.text.includes("referralCredited"));
});

test("register: unknown, malformed, self-phone and non-donor invites are ignored (still registers)", async () => {
  cur.inviter = null;
  let r = await call("POST", "/api/auth/register", { body: { ...GOOD, ref: CODE } });
  assert.equal(r.status, 201); assert.equal(created.at(-1).referredBy, null);
  r = await call("POST", "/api/auth/register", { body: { ...GOOD, ref: "{$ne:1}" } });
  assert.equal(r.status, 201); assert.equal(created.at(-1).referredBy, null);
  cur.inviter = { _id: "INVITER", role: "donor", isGuest: false, phone: GOOD.phone };
  r = await call("POST", "/api/auth/register", { body: { ...GOOD, ref: CODE } });
  assert.equal(r.status, 201); assert.equal(created.at(-1).referredBy, null, "same phone = no credit path");
  cur.inviter = { _id: "INVITER", role: "donor", isGuest: false, phone: "9876543210" };
  r = await call("POST", "/api/auth/register", { body: { ...GOOD, role: "hospital", hospitalName: "City Hospital", ref: CODE } });
  assert.equal(r.status, 201); assert.equal(created.at(-1).referredBy, null, "hospitals can't be referred");
  r = await call("POST", "/api/auth/register", { body: { ...GOOD, role: "seeker", ref: CODE } });
  assert.equal(r.status, 201); assert.equal(created.at(-1).referredBy, null, "seekers can't be referred");
});

test("GET /me/referral: a donor gets a code and bare counts, nothing about who was invited", async () => {
  const me = { role: "donor", isGuest: false, referralCount: 2, saves: 0, async save() { this.saves++; return this; } };
  cur.me = me; cur.signedUp = 5;
  const r = await call("GET", "/api/auth/me/referral");
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.json).sort(), ["code", "donated", "signedUp"]);
  assert.match(r.json.code, /^[2-9A-HJ-NP-Z]{8}$/);
  assert.equal(r.json.signedUp, 5);
  assert.equal(r.json.donated, 2);
  assert.equal(me.saves, 1);
  const again = await call("GET", "/api/auth/me/referral");
  assert.equal(again.json.code, r.json.code, "the code is stable");
  assert.equal(me.saves, 1, "and not re-saved");
});

test("GET /me/referral: not for seekers, hospitals or guests; needs login", async () => {
  for (const extra of [{ role: "seeker" }, { role: "hospital" }, { role: "donor", isGuest: true }]) {
    cur.me = { isGuest: false, ...extra };
    assert.equal((await call("GET", "/api/auth/me/referral")).status, 403);
  }
  cur.me = null;
  assert.equal((await call("GET", "/api/auth/me/referral")).status, 404);
  assert.equal((await call("GET", "/api/auth/me/referral", { uid: null })).status, 401);
});

// ---------------- card ----------------
const baseUser = (extra = {}) => ({ _id: "OWNER", name: "Rohan Sharma", phone: "9876543210", role: "donor", createdAt: new Date("2025-03-04"), familyMembers: [{ _id: "f".repeat(24), name: "Grandma Kamla", bloodGroup: "B+" }], ...extra });
const baseCard = (show = {}, extra = {}) => ({ cardId: "RS-7K4M-9QX2", owner: "OWNER", familyMemberId: null, kind: "member", hidden: false, show: { name: true, bloodGroup: true, tier: true, verified: true, memberSince: false, eligibleToday: false, referrals: false, ...show }, emergencyContact: { enabled: false }, createdAt: new Date(), ...extra });
const baseDonor = (extra = {}) => ({ _id: "d".repeat(24), bloodGroup: "O+", verified: true, familyMemberId: null, donationHistory: [], ...extra });

test("card: owner sees the count; public sees it only if the owner turned it on, as a bare number", () => {
  const user = baseUser({ referralCount: 2 });
  const own = serializeOwnCard(buildCardView(baseCard(), user, [baseDonor()]));
  assert.equal(own.referralsDonated, 2);
  assert.equal(own.settings.show.referrals, false);
  const hidden = serializePublicCard(buildCardView(baseCard(), user, [baseDonor()]));
  assert.equal(hidden.referralsDonated, undefined, "off by default");
  assert.deepEqual(Object.keys(hidden).sort(), ["bloodGroup", "kind", "name", "tier", "verified"]);
  const shown = serializePublicCard(buildCardView(baseCard({ referrals: true }), user, [baseDonor()]));
  assert.equal(shown.referralsDonated, 2);
  assert.ok(!JSON.stringify(shown).includes("OWNER"));
  const none = serializePublicCard(buildCardView(baseCard({ referrals: true }), baseUser({ referralCount: 0 }), [baseDonor()]));
  assert.equal(none.referralsDonated, undefined, "zero is not shown");
});

test("card: a family member's card never carries the account holder's referral count", () => {
  const fam = baseCard({ referrals: true, name: false }, { familyMemberId: "f".repeat(24) });
  const out = serializePublicCard(buildCardView(fam, baseUser({ referralCount: 2 }), [baseDonor({ familyMemberId: "f".repeat(24) })]));
  assert.equal(out.referralsDonated, undefined);
});

test("card settings route accepts the new referrals toggle (whitelist includes it)", async () => {
  const cardRoutes = require("../routes/cards");
  const app2 = express(); app2.use(express.json()); app2.use("/api/cards", cardRoutes);
  const s2 = await new Promise((r) => { const s = app2.listen(0, () => r(s)); });
  const url = `http://localhost:${s2.address().port}`;
  const owner = baseUser();
  const card = { ...baseCard({}, { cardId: generateCardId() }), save: async function () { return this; } };
  User.findOne = () => q(owner);
  Card.findOne = () => q(card);
  Donor.find = () => q([baseDonor()]);
  const res = await fetch(`${url}/api/cards/${card.cardId}/settings`, { method: "PATCH", headers: { "content-type": "application/json", "x-uid": "u" }, body: JSON.stringify({ show: { referrals: true, evil: true } }) });
  const body = await res.json();
  s2.close();
  assert.equal(res.status, 200);
  assert.equal(card.show.referrals, true);
  assert.equal(body.card.settings.show.referrals, true);
  assert.equal(card.show.evil, undefined);
});
