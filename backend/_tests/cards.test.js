const test = require("node:test");
const assert = require("node:assert/strict");

process.env.ADMIN_UIDS = "admin1";
const vt = require.resolve("../middleware/verifyToken");
require.cache[vt] = {
  id: vt, filename: vt, loaded: true,
  exports: (req, res, next) => {
    const uid = req.headers["x-uid"];
    if (!uid) return res.status(401).json({ error: "no login" });
    req.user = { uid, email: null, emailVerified: req.headers["x-unverified"] ? false : true };
    next();
  },
};

const express = require("express");
const User = require("../models/User");
const Donor = require("../models/Donor");
const Card = require("../models/Card");
const { generateCardId, normalizeCardId, ALPHABET } = require("../utils/cardId");
const { createLimiter } = require("../utils/rateLimit");
const { serializePublicCard, serializeOwnCard } = require("../utils/serializers");
const { buildCardView } = require("../utils/cardView");
const cardRoutes = require("../routes/cards");

// ---------------- pure: card ids ----------------
test("card ids: format, alphabet (no 0/O/1/I), uniqueness", () => {
  const seen = new Set();
  for (let i = 0; i < 3000; i++) {
    const id = generateCardId();
    assert.match(id, /^RS-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
    assert.ok(!/[01OI]/.test(id.slice(3).replace("-", "")), id);
    assert.equal(normalizeCardId(id), id);
    seen.add(id);
  }
  assert.equal(seen.size, 3000);
  assert.equal(ALPHABET.length, 32);
});

test("card ids: lowercase / no hyphens / spaces are accepted and normalised", () => {
  const id = generateCardId();
  assert.equal(normalizeCardId(id.toLowerCase()), id);
  assert.equal(normalizeCardId(id.replace(/-/g, "")), id);
  assert.equal(normalizeCardId(`  ${id}  `), id);
});

test("card ids: every single-character typo is caught by the check character", () => {
  const id = generateCardId();
  const chars = id.replace(/-/g, "").slice(2).split("");
  for (let pos = 0; pos < chars.length; pos++) {
    for (const ch of ALPHABET) {
      if (ch === chars[pos]) continue;
      const mutated = chars.slice();
      mutated[pos] = ch;
      assert.equal(normalizeCardId("RS" + mutated.join("")), null, `typo at ${pos} -> ${ch} slipped through`);
    }
  }
});

test("card ids: junk is rejected", () => {
  for (const bad of [null, undefined, "", "RS-", "RS-AAAA-AAAA", "XX-7K4M-9QX2", "RS-0000-0000", "RS-7K4M-9QX2-X", { a: 1 }, "RS-7K4M-9QX!"]) {
    assert.equal(normalizeCardId(bad), null);
  }
});

test("card ids: not derived from anything about the person (random each time)", () => {
  assert.notEqual(generateCardId(), generateCardId());
});

// ---------------- pure: rate limiter ----------------
test("rate limiter: blocks after max, frees after the window", () => {
  const l = createLimiter({ windowMs: 1000, max: 3 });
  for (let i = 0; i < 3; i++) assert.ok(l.hit("ip", 1000 + i).allowed);
  const blocked = l.hit("ip", 1500);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec >= 1);
  assert.ok(l.hit("other", 1500).allowed, "other keys are unaffected");
  assert.ok(l.hit("ip", 2100).allowed, "window has passed");
});

// ---------------- pure: serializers ----------------
const SECRETS = ["9876543210", "secret@mail.com", "FCM_TOKEN_XYZ", "12 Secret Street", "PHOTO_DATA", "Grandma Kamla", "9123456780", "Emergency Eve", "OWNER_OBJECT_ID"];
const assertNoLeak = (text, allowed = []) => { for (const s of SECRETS.filter((x) => !allowed.includes(x))) assert.ok(!text.includes(s), `LEAKED ${s}`); };

const baseUser = (extra = {}) => ({
  _id: "OWNER_OBJECT_ID", name: "Rohan Sharma", phone: "9876543210", email: "secret@mail.com", address: "12 Secret Street",
  photo: "PHOTO_DATA", alternatePhone: "9123456780", role: "donor", createdAt: new Date("2025-03-04"),
  familyMembers: [{ _id: "f".repeat(24), name: "Grandma Kamla", relation: "Grandmother", bloodGroup: "B+" }], ...extra,
});
const baseCard = (extra = {}) => ({
  cardId: "RS-7K4M-9QX2", owner: "OWNER_OBJECT_ID", familyMemberId: null, kind: "member", hidden: false,
  show: { name: true, bloodGroup: true, tier: true, verified: true, memberSince: false, eligibleToday: false },
  emergencyContact: { enabled: true, name: "Emergency Eve", phone: "9123456780" },
  createdAt: new Date("2025-03-04"), ...extra,
});
const baseDonor = (extra = {}) => ({ _id: "d".repeat(24), bloodGroup: "O+", verified: true, sex: "male", familyMemberId: null, fcmTokens: ["FCM_TOKEN_XYZ"], location: { coordinates: [77.2, 28.6] }, donationHistory: [{ date: new Date("2020-01-01") }], ...extra });

test("public card: only the default minimal fields", () => {
  const out = serializePublicCard(buildCardView(baseCard(), baseUser(), [baseDonor()]));
  assert.deepEqual(Object.keys(out).sort(), ["bloodGroup", "kind", "name", "tier", "verified"]);
  assert.equal(out.name, "Rohan S.");
  assert.equal(out.bloodGroup, "O+");
  assertNoLeak(JSON.stringify(out));
});

test("public card: each field disappears when the owner turns it off", () => {
  const off = { name: false, bloodGroup: false, tier: false, verified: false, memberSince: false, eligibleToday: false };
  const out = serializePublicCard(buildCardView(baseCard({ show: off }), baseUser(), [baseDonor()]));
  assert.deepEqual(out, { kind: "member" });
});

test("public card: memberSince is a year only; eligibleToday is a bare boolean", () => {
  const on = { name: true, bloodGroup: true, tier: true, verified: true, memberSince: true, eligibleToday: true };
  const out = serializePublicCard(buildCardView(baseCard({ show: on }), baseUser(), [baseDonor()]));
  assert.equal(out.memberSinceYear, 2025);
  assert.equal(out.eligibleToday, true);
  const justDonated = baseDonor({ donationHistory: [{ date: new Date() }] });
  const out2 = serializePublicCard(buildCardView(baseCard({ show: on }), baseUser(), [justDonated]));
  assert.equal(out2.eligibleToday, false);
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(JSON.stringify(out2)), "no full dates, only the year");
});

test("public card: family member card never reveals the account holder or other family", () => {
  const fam = baseCard({ familyMemberId: "f".repeat(24), show: { name: false, bloodGroup: true, tier: true, verified: true, memberSince: false, eligibleToday: false } });
  const out = serializePublicCard(buildCardView(fam, baseUser(), [baseDonor({ familyMemberId: "f".repeat(24), bloodGroup: "B+" })]));
  assert.equal(out.name, undefined);
  assert.equal(out.bloodGroup, "B+");
  assertNoLeak(JSON.stringify(out));
});

test("public card: partner card shows hospital name and verified flag only", () => {
  const card = baseCard({ kind: "partner" });
  const u = baseUser({ role: "hospital", hospitalName: "City Hospital", partnerVerified: false });
  const out = serializePublicCard(buildCardView(card, u, []));
  assert.deepEqual(out, { kind: "partner", hospitalName: "City Hospital", verifiedPartner: false });
  const out2 = serializePublicCard(buildCardView(card, { ...u, partnerVerified: true }, []));
  assert.equal(out2.verifiedPartner, true);
});

test("own card: owner sees their emergency contact and photo; public never does", () => {
  const view = buildCardView(baseCard(), baseUser(), [baseDonor()]);
  const own = serializeOwnCard(view);
  assert.equal(own.emergencyContact.name, "Emergency Eve");
  assert.equal(own.photo, "PHOTO_DATA");
  assert.ok(!JSON.stringify(own).includes("secret@mail.com"));
  assert.ok(!JSON.stringify(own).includes("FCM_TOKEN_XYZ"));
  assertNoLeak(JSON.stringify(serializePublicCard(view)));
});

// ---------------- routes ----------------
const q = (result) => { const o = { populate: () => o, sort: () => o, limit: () => o, select: () => o, lean: () => o, then: (a, b) => Promise.resolve(result).then(a, b) }; return o; };
const cur = {};
const calls = { cardFindOne: 0 };
User.findOne = () => q(cur.user);
User.findById = () => q(cur.owner);
Donor.find = () => q(cur.donors || []);
Donor.findOne = () => q(cur.donor);
Card.find = () => q(cur.cards || []);
Card.findOne = (filter) => { calls.cardFindOne++; cur.lastFilter = filter; return q(cur.card); };
Card.create = async (data) => ({ ...data, createdAt: new Date(), save: async function () { return this; } });
const doc = (o) => ({ ...o, save: async function () { cur.saved = this; return this; } });

const app = express();
app.use(express.json());
app.set("trust proxy", true);
app.use("/api/cards", cardRoutes);
app.use("/api/admin", require("../routes/admin"));

let server, base;
test.before(async () => { await new Promise((r) => (server = app.listen(0, r))); base = `http://localhost:${server.address().port}`; });
test.after(() => server.close());
test.beforeEach(() => { for (const k of Object.keys(cur)) delete cur[k]; calls.cardFindOne = 0; Object.values(cardRoutes._limiters).forEach((l) => l.reset()); });

const call = async (method, path, { uid = "u", body, ip } = {}) => {
  const res = await fetch(base + path, { method, headers: { "content-type": "application/json", ...(uid ? { "x-uid": uid } : {}), ...(ip ? { "x-forwarded-for": ip } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, text, json: text ? JSON.parse(text) : null, headers: res.headers };
};
const VALID = "RS-7K4M-9QX2";
const validId = normalizeCardId(VALID) ? VALID : generateCardId();

test("GET /cards/public/:id returns minimal info, no login needed, no-store + noindex", async () => {
  const id = generateCardId();
  cur.card = doc(baseCard({ cardId: id })); cur.owner = baseUser(); cur.donors = [baseDonor()];
  const r = await call("GET", `/api/cards/public/${id}`, { uid: null });
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.json.card).sort(), ["bloodGroup", "kind", "name", "tier", "verified"]);
  assertNoLeak(r.text);
  assert.match(r.headers.get("cache-control"), /no-store/);
  assert.match(r.headers.get("x-robots-tag"), /noindex/);
});

test("public lookup: hidden, unknown and malformed ids give the same 404", async () => {
  const id = generateCardId();
  cur.card = doc(baseCard({ cardId: id, hidden: true })); cur.owner = baseUser();
  const hidden = await call("GET", `/api/cards/public/${id}`, { uid: null });
  cur.card = null;
  const unknown = await call("GET", `/api/cards/public/${generateCardId()}`, { uid: null });
  const malformed = await call("GET", `/api/cards/public/RS-NOPE-NOPE`, { uid: null });
  for (const r of [hidden, unknown, malformed]) { assert.equal(r.status, 404); assert.deepEqual(r.json, { error: "Card not found" }); }
});

test("public lookup: a mistyped id never reaches the database", async () => {
  const before = calls.cardFindOne;
  await call("GET", "/api/cards/public/RS-AAAA-AAAA", { uid: null });
  assert.equal(calls.cardFindOne, before);
});

test("public lookup: repeated misses from one IP get blocked (429), other IPs unaffected", async () => {
  cur.card = null;
  let last;
  for (let i = 0; i < 9; i++) last = await call("GET", `/api/cards/public/${generateCardId()}`, { uid: null, ip: "9.9.9.9" });
  assert.equal(last.status, 429);
  assert.ok(last.headers.get("retry-after"));
  cur.card = doc(baseCard({ cardId: "RS-ZZZZ-ZZZZ" })); cur.owner = baseUser(); cur.donors = [baseDonor()];
  const other = await call("GET", `/api/cards/public/${generateCardId()}`, { uid: null, ip: "8.8.8.8" });
  assert.notEqual(other.status, 429);
});

test("public lookup: general per-IP cap", async () => {
  cur.card = doc(baseCard()); cur.owner = baseUser(); cur.donors = [baseDonor()];
  let status = 200;
  for (let i = 0; i < 45; i++) status = (await call("GET", `/api/cards/public/${generateCardId()}`, { uid: null, ip: "7.7.7.7" })).status;
  assert.equal(status, 429);
});

test("GET /cards/mine: needs login; guests get no cards", async () => {
  assert.equal((await call("GET", "/api/cards/mine", { uid: null })).status, 401);
  cur.user = { _id: "u1", role: "seeker", isGuest: true };
  const r = await call("GET", "/api/cards/mine");
  assert.deepEqual(r.json, { guest: true, cards: [] });
});

test("GET /cards/mine: creates self + family cards (family name hidden by default), no secrets of others", async () => {
  cur.user = baseUser(); cur.cards = []; cur.donors = [baseDonor()];
  const r = await call("GET", "/api/cards/mine");
  assert.equal(r.status, 200);
  assert.equal(r.json.cards.length, 2);
  const self = r.json.cards.find((c) => c.isSelf);
  const fam = r.json.cards.find((c) => !c.isSelf);
  assert.equal(self.settings.show.name, true);
  assert.equal(fam.settings.show.name, false, "family cards keep the name private by default");
  assert.equal(fam.name, "Grandma Kamla");
  assert.ok(!r.text.includes("FCM_TOKEN_XYZ") && !r.text.includes("secret@mail.com") && !r.text.includes("12 Secret Street"));
});

test("hospital accounts get a partner card, not a donor card", async () => {
  cur.user = baseUser({ role: "hospital", hospitalName: "City Hospital", familyMembers: [] }); cur.cards = [];
  const r = await call("GET", "/api/cards/mine");
  assert.equal(r.json.cards.length, 1);
  assert.equal(r.json.cards[0].kind, "partner");
  assert.equal(r.json.cards[0].partnerVerified, false);
});

test("PATCH settings: owner can change toggles; unknown keys ignored; others cannot", async () => {
  const id = generateCardId();
  cur.user = baseUser(); cur.donors = [baseDonor()];
  cur.card = doc(baseCard({ cardId: id }));
  const r = await call("PATCH", `/api/cards/${id}/settings`, { body: { hidden: true, show: { memberSince: true, isAdmin: true, name: "yes" }, role: "admin" } });
  assert.equal(r.status, 200);
  assert.equal(r.json.card.settings.hidden, true);
  assert.equal(r.json.card.settings.show.memberSince, true);
  assert.equal(r.json.card.settings.show.name, true, "non-boolean ignored");
  assert.equal(cur.saved.isAdmin, undefined);
  cur.card = null; // not the owner's card
  const other = await call("PATCH", `/api/cards/${id}/settings`, { body: { hidden: true } });
  assert.equal(other.status, 404);
});

test("PATCH settings: emergency contact needs a valid phone and a name", async () => {
  const id = generateCardId();
  cur.user = baseUser(); cur.donors = [baseDonor()];
  cur.card = doc(baseCard({ cardId: id, emergencyContact: { enabled: false } }));
  assert.equal((await call("PATCH", `/api/cards/${id}/settings`, { body: { emergencyContact: { enabled: true, name: "Eve", phone: "12345" } } })).status, 400);
  assert.equal((await call("PATCH", `/api/cards/${id}/settings`, { body: { emergencyContact: { enabled: true } } })).status, 400);
  const ok = await call("PATCH", `/api/cards/${id}/settings`, { body: { emergencyContact: { enabled: true, name: "Eve", phone: "9123456780" } } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.card.emergencyContact.enabled, true);
});

test("POST regenerate: gives a new valid id and records the time", async () => {
  const id = generateCardId();
  cur.user = baseUser(); cur.donors = [baseDonor()];
  cur.card = doc(baseCard({ cardId: id }));
  const r = await call("POST", `/api/cards/${id}/regenerate`);
  assert.equal(r.status, 200);
  assert.notEqual(r.json.card.cardId, id);
  assert.equal(normalizeCardId(r.json.card.cardId), r.json.card.cardId);
  assert.ok(r.json.card.regeneratedAt);
});

test("hospital lookup by card id: hospitals only; full name+phone but no email/tokens/location", async () => {
  const id = generateCardId();
  cur.card = doc(baseCard({ cardId: id }));
  cur.donor = { ...baseDonor(), user: baseUser() };
  cur.user = baseUser({ role: "donor" });
  assert.equal((await call("GET", `/api/cards/lookup/${id}`)).status, 403);
  cur.user = baseUser({ role: "hospital", partnerVerified: false });
  const unapproved = await call("GET", `/api/cards/lookup/${id}`);
  assert.equal(unapproved.status, 403);
  assert.equal(unapproved.json.code, "HOSPITAL_NOT_APPROVED");
  cur.user = baseUser({ role: "hospital", partnerVerified: true });
  const r = await call("GET", `/api/cards/lookup/${id}`);
  assert.equal(r.status, 200);
  assert.equal(r.json.donors[0].display.name, "Rohan Sharma");
  assert.equal(r.json.donors[0].display.phone, "9876543210");
  assertNoLeak(r.text, ["9876543210"]);
  assert.ok(!r.text.includes("77.2") && !r.text.includes("28.6"), "exact location leaked");
  cur.card = doc(baseCard({ cardId: id, hidden: true }));
  assert.equal((await call("GET", `/api/cards/lookup/${id}`)).status, 404);
  assert.equal((await call("GET", `/api/cards/lookup/RS-BAD`)).status, 404);
});

test("admin: only admins can mark a hospital as a verified partner", async () => {
  const hid = "a".repeat(24);
  cur.user = doc({ _id: hid, role: "hospital", hospitalName: "City Hospital", partnerVerified: false });
  assert.equal((await call("PATCH", `/api/admin/hospitals/${hid}/partner-verified`, { uid: "random", body: { verified: true } })).status, 403);
  assert.equal((await call("PATCH", `/api/admin/hospitals/${hid}/partner-verified`, { uid: "admin1", body: { verified: "yes" } })).status, 400);
  const ok = await call("PATCH", `/api/admin/hospitals/${hid}/partner-verified`, { uid: "admin1", body: { verified: true } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.hospital.partnerVerified, true);
});
