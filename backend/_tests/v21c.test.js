// v2.1c — opt-in badges & streaks.
const test = require("node:test");
const assert = require("node:assert/strict");

const vt = require.resolve("../middleware/verifyToken");
require.cache[vt] = {
  id: vt, filename: vt, loaded: true,
  exports: (req, res, next) => {
    const uid = req.headers["x-uid"];
    if (!uid) return res.status(401).json({ error: "no login" });
    req.user = { uid, email: "u@example.com", emailVerified: true };
    next();
  },
};
const express = require("express");
const User = require("../models/User");
const Donor = require("../models/Donor");
const ach = require("../utils/achievements");
const { serializePublicCard, serializeOwnCard } = require("../utils/serializers");
const { buildCardView } = require("../utils/cardView");

const day = (n) => new Date(Date.UTC(2026, 0, 1) + n * 86400e3).toISOString();
const hist = (...days) => days.map((n) => ({ date: day(n) }));

// ---------------- pure ----------------
test("badges follow recorded donations only: 1, 3, 5, 10, 25", () => {
  const ids = (n) => ach.computeAchievements({ donationHistory: hist(...Array.from({ length: n }, (_, i) => i * 100)) }).badges.map((b) => b.id);
  assert.deepEqual(ids(0), []);
  assert.deepEqual(ids(1), ["first-drop"]);
  assert.deepEqual(ids(2), ["first-drop"]);
  assert.deepEqual(ids(3), ["first-drop", "regular"]);
  assert.deepEqual(ids(5), ["first-drop", "regular", "committed"]);
  assert.deepEqual(ids(10), ["first-drop", "regular", "committed", "ten-times"]);
  assert.equal(ids(25).length, 5);
});

test("bridge builder needs a friend you invited who donated", () => {
  assert.ok(!ach.computeAchievements({ donationHistory: [], referralCount: 0 }).badges.some((b) => b.id === "bridge-builder"));
  assert.ok(ach.computeAchievements({ donationHistory: [], referralCount: 1 }).badges.some((b) => b.id === "bridge-builder"));
});

test("next badge and counts", () => {
  const a = ach.computeAchievements({ donationHistory: hist(0, 120) });
  assert.equal(a.total, 2);
  assert.deepEqual(a.next, { id: "regular", label: "Regular donor", needed: 1 });
  assert.equal(a.firstDonation, day(0)); assert.equal(a.lastDonation, day(120));
  assert.equal(ach.computeAchievements({ donationHistory: hist(...Array.from({ length: 25 }, (_, i) => i * 100)) }).next, null);
  assert.deepEqual(ach.computeAchievements({}), { total: 0, firstDonation: null, lastDonation: null, badges: [], next: { id: "first-drop", label: "First drop", needed: 1 }, streak: { current: 0, best: 0 } });
});

test("streak: donations within ~6 months of each other; a long gap resets; alive only if the last one is recent", () => {
  const now = new Date(day(1000));
  assert.deepEqual(ach.computeStreak([], now), { current: 0, best: 0 });
  const t = (...d) => d.map((n) => new Date(day(n)).getTime());
  assert.deepEqual(ach.computeStreak(t(900, 1000), now), { current: 2, best: 2 });
  assert.deepEqual(ach.computeStreak(t(500, 650, 800, 980), now), { current: 4, best: 4 });
  assert.deepEqual(ach.computeStreak(t(100, 250, 700, 850), new Date(day(900))), { current: 2, best: 2 }, "gap of 450 days broke the first run");
  assert.deepEqual(ach.computeStreak(t(100, 250, 400), new Date(day(1000))), { current: 0, best: 3 }, "streak lapsed, best is remembered");
  assert.deepEqual(ach.computeStreak(t(0, 183), new Date(day(183))), { current: 2, best: 2 }, "exactly 183 days still counts");
  assert.deepEqual(ach.computeStreak(t(0, 184), new Date(day(184))), { current: 1, best: 1 });
  assert.deepEqual(ach.computeAchievements({ donationHistory: [{ date: "nonsense" }, { date: null }] }).total, 0);
});

test("nothing in the achievement data rewards donating early", () => {
  const out = JSON.stringify(ach.computeAchievements({ donationHistory: hist(0, 91, 182), referralCount: 2 }));
  assert.ok(!/(soon|early|hurry|now|faster)/i.test(out));
  // an 'early' donation (inside the gap) can't create extra badges beyond its count
  assert.equal(ach.computeAchievements({ donationHistory: hist(0, 10, 20) }).badges.length, 2);
});

// ---------------- routes ----------------
const q = (result) => { const o = { select: () => o, then: (a, b) => Promise.resolve(result).then(a, b) }; return o; };
const cur = {};
const authRoutes = require("../routes/auth");
const app = express(); app.use(express.json()); app.use("/api/auth", authRoutes);
let server, base;
test.before(async () => { await new Promise((r) => (server = app.listen(0, r))); base = `http://localhost:${server.address().port}`; });
test.after(() => server.close());
test.beforeEach(() => {
  for (const k of Object.keys(cur)) delete cur[k];
  User.findOne = () => q(cur.user);
  Donor.findOne = (f) => { cur.donorFilter = f; return q(cur.donor); };
});
const call = async (method, path, { uid = "u", body } = {}) => {
  const res = await fetch(base + path, { method, headers: { "content-type": "application/json", ...(uid ? { "x-uid": uid } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, text, json: text ? JSON.parse(text) : null };
};
const donorUser = (extra = {}) => ({ _id: "U1", role: "donor", isGuest: false, achievementsOptIn: false, referralCount: 0, async save() { return this; }, ...extra });

test("opt-in OFF (the default): nothing is computed or returned", async () => {
  cur.user = donorUser(); cur.donor = { donationHistory: hist(0, 100, 200) };
  const r = await call("GET", "/api/auth/me/achievements");
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { enabled: false });
  assert.equal(cur.donorFilter, undefined, "donation history wasn't even read");
});

test("opt-in ON: totals, badges and streak for the account holder's OWN profile only", async () => {
  cur.user = donorUser({ achievementsOptIn: true, referralCount: 1 });
  cur.donor = { donationHistory: hist(0, 100, 200) };
  const r = await call("GET", "/api/auth/me/achievements");
  assert.equal(r.json.enabled, true);
  assert.equal(r.json.total, 3);
  assert.deepEqual(r.json.badges.map((b) => b.id), ["first-drop", "regular", "bridge-builder"]);
  assert.equal(r.json.streak.best, 3);
  assert.deepEqual(cur.donorFilter, { user: "U1", familyMemberId: null }, "family members' donations are never counted");
  cur.donor = null;
  assert.equal((await call("GET", "/api/auth/me/achievements")).json.total, 0, "no donor profile yet = zero, no crash");
});

test("toggle: strict boolean, donors only, login needed", async () => {
  cur.user = donorUser();
  const on = await call("PATCH", "/api/auth/me/achievements", { body: { enabled: true } });
  assert.deepEqual(on.json, { enabled: true }); assert.equal(cur.user.achievementsOptIn, true);
  const off = await call("PATCH", "/api/auth/me/achievements", { body: { enabled: false } });
  assert.deepEqual(off.json, { enabled: false });
  for (const bad of [{}, { enabled: "true" }, { enabled: 1 }, { enabled: null }]) assert.equal((await call("PATCH", "/api/auth/me/achievements", { body: bad })).status, 400, JSON.stringify(bad));
  for (const role of ["seeker", "hospital"]) { cur.user = donorUser({ role }); assert.equal((await call("GET", "/api/auth/me/achievements")).status, 403); assert.equal((await call("PATCH", "/api/auth/me/achievements", { body: { enabled: true } })).status, 403); }
  cur.user = donorUser({ isGuest: true });
  assert.equal((await call("GET", "/api/auth/me/achievements")).status, 403);
  cur.user = null;
  assert.equal((await call("GET", "/api/auth/me/achievements")).status, 404);
  assert.equal((await call("GET", "/api/auth/me/achievements", { uid: null })).status, 401);
});

// ---------------- card privacy ----------------
const baseUser = (extra = {}) => ({ _id: "OWNER", name: "Rohan Sharma", phone: "9876543210", role: "donor", createdAt: new Date("2025-03-04"), referralCount: 1, familyMembers: [{ _id: "f".repeat(24), name: "Grandma Kamla", bloodGroup: "B+" }], ...extra });
const baseCard = (show = {}, extra = {}) => ({ cardId: "RS-7K4M-9QX2", owner: "OWNER", familyMemberId: null, kind: "member", hidden: false, show: { name: true, bloodGroup: true, tier: true, verified: true, memberSince: false, eligibleToday: false, referrals: false, badges: false, ...show }, emergencyContact: { enabled: false }, createdAt: new Date(), ...extra });
const donor = (extra = {}) => ({ _id: "d".repeat(24), bloodGroup: "O+", verified: true, familyMemberId: null, donationHistory: hist(0, 100, 200), ...extra });
const pub = (c, u, d) => serializePublicCard(buildCardView(c, u, d));

test("card: badges are hidden unless BOTH the account opt-in and the card switch are on", () => {
  const d = [donor()];
  assert.equal(pub(baseCard(), baseUser({ achievementsOptIn: true }), d).badges, undefined, "card switch off");
  assert.equal(pub(baseCard({ badges: true }), baseUser({ achievementsOptIn: false }), d).badges, undefined, "account opt-in off");
  const both = pub(baseCard({ badges: true }), baseUser({ achievementsOptIn: true }), d);
  assert.deepEqual(both.badges.map((b) => b.id), ["first-drop", "regular", "bridge-builder"]);
  assert.deepEqual(Object.keys(both.badges[0]).sort(), ["id", "label"], "just names — no dates, counts or streak");
  assert.ok(!JSON.stringify(both).includes("streak") && !JSON.stringify(both).includes("OWNER"));
});

test("card: family cards never carry the account holder's badges; no badges earned = key absent", () => {
  const fam = baseCard({ badges: true }, { familyMemberId: "f".repeat(24) });
  assert.equal(pub(fam, baseUser({ achievementsOptIn: true }), [donor({ familyMemberId: "f".repeat(24) })]).badges, undefined);
  assert.equal(pub(baseCard({ badges: true }), baseUser({ achievementsOptIn: true, referralCount: 0 }), [donor({ donationHistory: [] })]).badges, undefined);
});

test("card: the owner's own view lists badges only when opted in; default public key set is unchanged", () => {
  const own = serializeOwnCard(buildCardView(baseCard(), baseUser({ achievementsOptIn: true }), [donor()]));
  assert.equal(own.badges.length, 3); assert.equal(own.settings.show.badges, false);
  assert.deepEqual(serializeOwnCard(buildCardView(baseCard(), baseUser(), [donor()])).badges, []);
  assert.deepEqual(Object.keys(pub(baseCard(), baseUser({ achievementsOptIn: true }), [donor()])).sort(), ["bloodGroup", "kind", "name", "tier", "verified"]);
});
