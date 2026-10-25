// v2.1 batch B — camp RSVPs + reminders, blood stock board.
const test = require("node:test");
const assert = require("node:assert/strict");

const vt = require.resolve("../middleware/verifyToken");
require.cache[vt] = {
  id: vt, filename: vt, loaded: true,
  exports: (req, res, next) => {
    const uid = req.headers["x-uid"];
    if (!uid) return res.status(401).json({ error: "no login" });
    req.user = { uid, email: "u@example.com", emailVerified: req.headers["x-unverified"] ? false : true };
    next();
  },
};

const express = require("express");
const User = require("../models/User");
const Camp = require("../models/Camp");
const CampRsvp = require("../models/CampRsvp");
const BloodStock = require("../models/BloodStock");
const stockLib = require("../utils/stock");

// ---------------- pure: stock rules ----------------
const ALL8 = { "A+": 5, "A-": 0, "B+": 12, "B-": 1, "AB+": 0, "AB-": 0, "O+": 30, "O-": 4 };

test("parseLevels: all 8 groups, whole numbers 0–999, nothing else", () => {
  const ok = stockLib.parseLevels(ALL8);
  assert.equal(ok.levels.length, 8);
  assert.deepEqual(ok.levels[0], { group: "A+", units: 5 });
  assert.equal(stockLib.parseLevels({ ...ALL8, "A+": "7" }).levels[0].units, 7, "digit strings are fine (form fields)");
  for (const bad of [null, undefined, [], "x", {}, { ...ALL8, "A+": -1 }, { ...ALL8, "A+": 1000 }, { ...ALL8, "A+": 2.5 }, { ...ALL8, "A+": "1e3" }, { ...ALL8, "A+": "" }, { ...ALL8, "A+": null }, { ...ALL8, "C+": 3 }]) {
    assert.ok(stockLib.parseLevels(bad).error, JSON.stringify(bad));
  }
  const missing = { ...ALL8 }; delete missing["O-"];
  assert.ok(stockLib.parseLevels(missing).error);
});

test("levelWord and staleness", () => {
  assert.deepEqual([0, 1, 4, 5, 99].map(stockLib.levelWord), ["None", "Low", "Low", "Available", "Available"]);
  const now = new Date("2026-10-25T12:00:00Z");
  assert.equal(stockLib.hoursSince("2026-10-25T09:30:00Z", now), 2);
  assert.equal(stockLib.hoursSince("2026-10-26T09:30:00Z", now), 0, "future dates never go negative");
  const fresh = stockLib.serializeStock({ _id: "b1", hospitalName: "City", address: "1 Rd", area: "Noida", location: { coordinates: [77.3, 28.5] }, levels: stockLib.parseLevels(ALL8).levels, stockUpdatedAt: "2026-10-25T10:00:00Z" }, now);
  assert.equal(fresh.hoursAgo, 2); assert.equal(fresh.stale, false);
  assert.deepEqual(fresh.location, { lng: 77.3, lat: 28.5 });
  assert.equal(fresh.levels.find((l) => l.group === "O-").level, "Low");
  const old = stockLib.serializeStock({ _id: "b1", hospitalName: "City", address: "a", area: "b", location: { coordinates: [1, 2] }, levels: [], stockUpdatedAt: "2026-10-23T12:00:00Z" }, now);
  assert.equal(old.stale, true);
  assert.equal(old.levels.length, 8, "missing groups show as 0 / None");
  assert.ok(!JSON.stringify(fresh).includes("hospital\":"), "no account ids in the public shape");
});

// ---------------- pure: reminders ----------------
const campReminders = require("../utils/campReminders");
const sendEmailMod = require("../utils/sendEmail");
const q = (result) => { const o = { select: () => o, populate: () => o, limit: () => o, sort: () => o, lean: () => o, then: (a, b) => Promise.resolve(result).then(a, b) }; return o; };

test("reminders: one email per RSVP, claimed before sending, never twice, skips guests/no email", async () => {
  const now = new Date("2026-11-10T08:00:00Z");
  const soon = { _id: "c1", name: "Noida Camp", hospitalName: "City", date: new Date("2026-11-11T05:00:00Z"), address: "Sector 18", area: "Noida" };
  let campFilter;
  Camp.find = (f) => { campFilter = f; return q([soon]); };
  const rows = [
    { _id: "r1", camp: "c1", user: { email: "a@x.com", isGuest: false } },
    { _id: "r2", camp: "c1", user: { email: "b@x.com", isGuest: true } },
    { _id: "r3", camp: "c1", user: { email: null, isGuest: false } },
    { _id: "r4", camp: "c1", user: { email: "d@x.com", isGuest: false } },
  ];
  let rsvpFilter; CampRsvp.find = (f) => { rsvpFilter = f; return q(rows); };
  const claimed = new Set(["r4"]); // another tick already took r4
  const order = [];
  CampRsvp.findOneAndUpdate = async (f) => { order.push("claim:" + f._id); if (claimed.has(f._id)) return null; claimed.add(f._id); return { _id: f._id }; };
  const sent = [];
  sendEmailMod.sendEmail = async (m) => { order.push("send:" + m.to); sent.push(m); };
  const n = await campReminders.sendCampReminders(now, { minGapMs: 0 });
  assert.equal(n, 1);
  assert.deepEqual(sent.map((m) => m.to), ["a@x.com"]);
  assert.ok(campFilter.date.$gt === now && campFilter.date.$lte.getTime() - now.getTime() === 24 * 3600e3, "only camps in the next 24h");
  assert.equal(rsvpFilter.reminderSentAt, null);
  assert.ok(order.indexOf("claim:r1") < order.indexOf("send:a@x.com"), "claimed before sending");
  assert.match(sent[0].text, /Noida Camp/);
  assert.ok(!/\d{10}/.test(sent[0].text), "no phone numbers in the email");
  // a second tick for the same rows sends nothing
  assert.equal(await campReminders.sendCampReminders(now, { minGapMs: 0 }), 0);
});

test("reminders: throttled between sweeps and quiet when no camp is near", async () => {
  Camp.find = () => q([]);
  assert.equal(await campReminders.sendCampReminders(new Date("2026-11-10T08:00:00Z"), { minGapMs: 0 }), 0);
  assert.equal(await campReminders.sendCampReminders(new Date("2026-11-10T08:00:01Z")), 0, "inside the minimum gap");
});

// ---------------- routes ----------------
const cur = {};
const rsvpCalls = [];
function installRouteStubs() {
  User.findOne = () => q(cur.user);
  Camp.findById = () => q(cur.camp);
  Camp.find = () => q(cur.camps || []);
  CampRsvp.find = () => q(cur.rsvps || []);
  BloodStock.deleteOne = async () => ({});
}
CampRsvp.countDocuments = async (f) => (f.camp ? (cur.already ? 1 : 0) : cur.recent || 0);
CampRsvp.updateOne = async (...a) => { rsvpCalls.push(["updateOne", ...a]); };
CampRsvp.deleteOne = async (...a) => { rsvpCalls.push(["deleteOne", ...a]); };
CampRsvp.deleteMany = async (...a) => { rsvpCalls.push(["deleteMany", ...a]); };
CampRsvp.updateMany = async (...a) => { rsvpCalls.push(["updateMany", ...a]); };
CampRsvp.aggregate = async () => cur.counts || [];
const campRoutes = require("../routes/camps");
const stockRoutes = require("../routes/stock");
const app = express(); app.use(express.json());
app.use("/api/camps", campRoutes); app.use("/api/stock", stockRoutes);
let server, base;
test.before(async () => { await new Promise((r) => (server = app.listen(0, r))); base = `http://localhost:${server.address().port}`; });
test.after(() => server.close());
test.beforeEach(() => { for (const k of Object.keys(cur)) delete cur[k]; rsvpCalls.length = 0; installRouteStubs(); });
const call = async (method, path, { uid = "u", body, headers = {} } = {}) => {
  const res = await fetch(base + path, { method, headers: { "content-type": "application/json", ...(uid ? { "x-uid": uid } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, text, json: text ? JSON.parse(text) : null };
};
const OID = "a".repeat(24);
const donor = { _id: "U1", role: "donor", isGuest: false };
const future = () => ({ _id: OID, date: new Date(Date.now() + 5 * 86400e3) });

test("RSVP: a donor can say they'll come; repeating it is harmless (no duplicate)", async () => {
  cur.user = donor; cur.camp = future();
  const r = await call("POST", `/api/camps/${OID}/rsvp`);
  assert.equal(r.status, 201); assert.deepEqual(r.json, { going: true });
  const [, filter, update, opts] = rsvpCalls[0];
  assert.deepEqual(filter, { camp: OID, user: "U1" });
  assert.ok(update.$setOnInsert && opts.upsert === true, "an upsert, so clicking twice never duplicates");
  cur.already = true;
  assert.equal((await call("POST", `/api/camps/${OID}/rsvp`)).status, 201);
});

test("RSVP: blocked for guests, hospitals, unverified email, past camps, missing camps, bad ids, no login", async () => {
  cur.camp = future();
  cur.user = { ...donor, isGuest: true };
  assert.equal((await call("POST", `/api/camps/${OID}/rsvp`)).status, 403);
  cur.user = { ...donor, role: "hospital" };
  assert.equal((await call("POST", `/api/camps/${OID}/rsvp`)).status, 403);
  cur.user = donor;
  const un = await call("POST", `/api/camps/${OID}/rsvp`, { headers: { "x-unverified": "1" } });
  assert.equal(un.status, 403); assert.equal(un.json.code, "EMAIL_NOT_VERIFIED");
  cur.camp = { _id: OID, date: new Date(Date.now() - 3 * 86400e3) };
  assert.equal((await call("POST", `/api/camps/${OID}/rsvp`)).status, 400);
  cur.camp = null;
  assert.equal((await call("POST", `/api/camps/${OID}/rsvp`)).status, 404);
  assert.equal((await call("POST", `/api/camps/not-an-id/rsvp`)).status, 404);
  assert.equal((await call("POST", `/api/camps/${OID}/rsvp`, { uid: null })).status, 401);
  assert.equal(rsvpCalls.length, 0, "nothing was saved in any of those cases");
});

test("RSVP: monthly cap stops RSVP-spam but never blocks someone already going", async () => {
  cur.user = donor; cur.camp = future(); cur.recent = 30;
  assert.equal((await call("POST", `/api/camps/${OID}/rsvp`)).status, 429);
  cur.already = true;
  assert.equal((await call("POST", `/api/camps/${OID}/rsvp`)).status, 201);
});

test("RSVP: cancel and my list", async () => {
  cur.user = donor;
  const c = await call("DELETE", `/api/camps/${OID}/rsvp`);
  assert.deepEqual(c.json, { going: false });
  assert.deepEqual(rsvpCalls[0], ["deleteOne", { camp: OID, user: "U1" }]);
  cur.rsvps = [{ camp: "c1" }, { camp: "c2" }];
  const m = await call("GET", "/api/camps/rsvps/mine");
  assert.deepEqual(m.json, { campIds: ["c1", "c2"] });
});

test("hospital sees a COUNT per camp, never who", async () => {
  cur.user = { _id: "H1", role: "hospital" };
  const camps = [{ _id: "c1", name: "A", toObject() { return { _id: "c1", name: "A" }; } }, { _id: "c2", name: "B", toObject() { return { _id: "c2", name: "B" }; } }];
  cur.camps = camps; cur.counts = [{ _id: "c1", n: 7 }];
  const r = await call("GET", "/api/camps/mine");
  assert.deepEqual(r.json.camps.map((c) => [c._id, c.rsvpCount]), [["c1", 7], ["c2", 0]]);
  assert.ok(!/user|email|phone|name":"U/i.test(JSON.stringify(r.json).replace(/"name":"[AB]"/g, "")));
});

test("changing a camp's date re-arms the reminder; deleting a camp removes RSVPs", async () => {
  cur.user = { _id: "H1", role: "hospital", partnerVerified: true };
  const camp = { _id: OID, name: "A", address: "x", area: "y", date: new Date("2026-12-01"), accessibility: {}, async save() { return this; }, async deleteOne() {} };
  Camp.findOne = () => q(camp);
  await call("PATCH", `/api/camps/${OID}`, { body: { date: "2026-12-05" } });
  assert.deepEqual(rsvpCalls.find((c) => c[0] === "updateMany").slice(1), [{ camp: OID }, { $set: { reminderSentAt: null } }]);
  rsvpCalls.length = 0;
  await call("PATCH", `/api/camps/${OID}`, { body: { name: "Renamed" } });
  assert.equal(rsvpCalls.length, 0, "other edits don't re-send reminders");
  await call("DELETE", `/api/camps/${OID}`);
  assert.deepEqual(rsvpCalls.find((c) => c[0] === "deleteMany").slice(1), [{ camp: OID }]);
});

// ---------------- stock routes ----------------
const boardDoc = (over = {}) => ({ _id: "b1", hospital: "H1", hospitalName: "City Hospital", address: "1 Ring Rd", area: "Noida", location: { coordinates: [77.3, 28.5] }, levels: stockLib.parseLevels(ALL8).levels, stockUpdatedAt: new Date(Date.now() - 3 * 3600e3), async save() { return this; }, ...over });
const approved = { _id: "H1", role: "hospital", partnerVerified: true, hospitalName: "City Hospital" };

test("stock: public list works without login, always carries the disclaimer, leaks no accounts", async () => {
  let seen; BloodStock.find = (f) => { seen = f; return q([boardDoc()]); };
  const r = await call("GET", "/api/stock", { uid: null });
  assert.equal(r.status, 200);
  assert.match(r.json.disclaimer, /call the blood bank to confirm/);
  const b = r.json.boards[0];
  assert.equal(b.hoursAgo, 3); assert.equal(b.stale, false);
  assert.ok(!("hospital" in b) && !r.text.includes("H1"));
  await call("GET", "/api/stock?bloodGroup=O-", { uid: null });
  assert.deepEqual(seen.levels, { $elemMatch: { group: "O-", units: { $gt: 0 } } });
  assert.equal((await call("GET", "/api/stock?bloodGroup=ZZ", { uid: null })).status, 400);
  await call("GET", "/api/stock?area=No.*ida(", { uid: null });
  assert.equal(seen.area.$regex, "No\\.\\*ida\\(", "search text is escaped, not used as a pattern");
});

test("stock: only approved, email-verified hospitals can write; seekers/donors cannot", async () => {
  const body = { levels: ALL8, address: "1 Ring Rd", area: "Noida", lat: 28.5, lng: 77.3 };
  BloodStock.findOne = () => q(null);
  cur.user = { _id: "U", role: "donor" };
  assert.equal((await call("PUT", "/api/stock/mine", { body })).status, 403);
  cur.user = { ...approved, partnerVerified: false };
  const w = await call("PUT", "/api/stock/mine", { body });
  assert.equal(w.status, 403); assert.equal(w.json.code, "HOSPITAL_NOT_APPROVED");
  cur.user = approved;
  const un = await call("PUT", "/api/stock/mine", { body, headers: { "x-unverified": "1" } });
  assert.equal(un.json.code, "EMAIL_NOT_VERIFIED");
  assert.equal((await call("PUT", "/api/stock/mine", { body, uid: null })).status, 401);
  assert.equal((await call("DELETE", "/api/stock/mine")).status, 200);
});

test("stock: validation on save (units, address/area, coordinates)", async () => {
  cur.user = approved; BloodStock.findOne = () => q(null);
  const good = { levels: ALL8, address: "1 Ring Rd", area: "Noida", lat: 28.5, lng: 77.3 };
  assert.equal((await call("PUT", "/api/stock/mine", { body: { ...good, levels: { ...ALL8, "A+": -4 } } })).status, 400);
  assert.equal((await call("PUT", "/api/stock/mine", { body: { ...good, levels: undefined } })).status, 400);
  assert.equal((await call("PUT", "/api/stock/mine", { body: { ...good, address: "  " } })).status, 400);
  assert.equal((await call("PUT", "/api/stock/mine", { body: { ...good, lat: 91 } })).status, 400);
  assert.equal((await call("PUT", "/api/stock/mine", { body: { ...good, lat: undefined, lng: undefined } })).status, 400, "first save needs a location");
});

test("stock: first save creates the board and stamps 'updated now'; later saves reuse address and location", async () => {
  cur.user = approved;
  let saved = null;
  const origCtor = BloodStock.prototype.save;
  BloodStock.findOne = () => q(null);
  BloodStock.prototype.save = async function () { saved = this; return this; };
  const body = { levels: ALL8, address: "1 Ring Rd", area: "Noida", lat: 28.5, lng: 77.3 };
  const r1 = await call("PUT", "/api/stock/mine", { body });
  assert.equal(r1.status, 200);
  assert.equal(r1.json.board.hoursAgo, 0);
  assert.equal(saved.hospitalName, "City Hospital");
  assert.deepEqual(saved.location.coordinates, [77.3, 28.5]);
  assert.equal(saved.levels.length, 8);
  // second save: only the numbers
  const existing = boardDoc();
  BloodStock.findOne = () => q(existing);
  const r2 = await call("PUT", "/api/stock/mine", { body: { levels: { ...ALL8, "O-": 0 } } });
  assert.equal(r2.status, 200);
  assert.equal(existing.address, "1 Ring Rd");
  assert.deepEqual(existing.location.coordinates, [77.3, 28.5]);
  assert.equal(existing.levels.find((l) => l.group === "O-").units, 0);
  assert.ok(Date.now() - new Date(existing.stockUpdatedAt).getTime() < 5000);
  BloodStock.prototype.save = origCtor;
});
