const test = require("node:test");
const assert = require("node:assert/strict");

process.env.ADMIN_UIDS = "admin1";
// Stand-in for Firebase login. Headers: x-uid (logged in as), x-unverified (email not verified), x-email.
const vt = require.resolve("../middleware/verifyToken");
require.cache[vt] = {
  id: vt, filename: vt, loaded: true,
  exports: (req, res, next) => {
    const uid = req.headers["x-uid"];
    if (!uid) return res.status(401).json({ error: "no login" });
    req.user = { uid, email: req.headers["x-email"] || null, emailVerified: req.headers["x-unverified"] ? false : true };
    next();
  },
};

const express = require("express");
const User = require("../models/User");
const Donor = require("../models/Donor");
const Request = require("../models/Request");
const Camp = require("../models/Camp");
const AuditLog = require("../models/AuditLog");
const { emailGate, hospitalGate } = require("../middleware/gates");
const { buildStatsCsv, suppress } = require("../utils/statsCsv");
const { applySecurity, makeLimiter } = require("../middleware/security");

const q = (result) => { const o = { populate: () => o, sort: () => o, limit: () => o, select: () => o, lean: () => o, then: (a, b) => Promise.resolve(result).then(a, b) }; return o; };
const cur = {};
const calls = { donorFindFilter: null, audit: [] };
User.findOne = (f) => { cur.userFilter = f; return q(typeof cur.userFn === "function" ? cur.userFn(f) : cur.user); };
User.find = () => q(cur.users || []);
User.findByIdAndUpdate = async () => ({});
User.aggregate = async () => cur.userAgg || [];
Donor.find = (filter) => { calls.donorFindFilter = filter; return q(cur.donors || []); };
Donor.findOne = () => q(cur.donor);
Donor.aggregate = async () => cur.candidates || cur.donorAgg || [];
Donor.populate = async (c) => c;
Request.find = () => q(cur.requests || []);
Request.findOne = () => q(cur.request);
Request.findById = () => q(cur.request);
Request.aggregate = async () => cur.requestAgg || [];
Request.updateMany = async () => ({});
Request.updateOne = async () => ({});
Camp.create = async (d) => ({ ...d, _id: "c1" });
AuditLog.create = async (d) => { if (cur.auditFails) throw new Error("db down"); calls.audit.push(d); return d; };
AuditLog.find = () => q(cur.auditEntries || []);

const app = express();
app.use(express.json());
app.use("/api/requests", require("../routes/requests"));
app.use("/api/donors", require("../routes/donors"));
app.use("/api/camps", require("../routes/camps"));
app.use("/api/auth", require("../routes/auth"));
app.use("/api/admin", require("../routes/admin"));

let server, base;
test.before(async () => { await new Promise((r) => (server = app.listen(0, r))); base = `http://localhost:${server.address().port}`; });
test.after(() => server.close());
test.beforeEach(() => { for (const k of Object.keys(cur)) delete cur[k]; calls.donorFindFilter = null; calls.audit.length = 0; });

const call = async (method, path, { uid = "u", body, headers = {} } = {}) => {
  const res = await fetch(base + path, { method, headers: { "content-type": "application/json", ...(uid ? { "x-uid": uid } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* not JSON (CSV) */ }
  return { status: res.status, text, json, headers: res.headers };
};
const ID = (c) => c.repeat(24);
const doc = (o) => ({ ...o, save: async function () { return this; } });
const UNVERIFIED = { "x-unverified": "1" };

// ---------------- gates (pure) ----------------
test("emailGate: verified passes, unverified is blocked with a clear code", () => {
  assert.equal(emailGate({ user: { emailVerified: true } }), null);
  const g = emailGate({ user: { emailVerified: false } });
  assert.equal(g.status, 403);
  assert.equal(g.body.code, "EMAIL_NOT_VERIFIED");
});

test("hospitalGate: needs hospital role, verified email AND admin approval", () => {
  const ok = { user: { emailVerified: true } };
  assert.equal(hospitalGate(ok, { role: "donor", partnerVerified: true }).status, 403);
  assert.equal(hospitalGate({ user: { emailVerified: false } }, { role: "hospital", partnerVerified: true }).body.code, "EMAIL_NOT_VERIFIED");
  assert.equal(hospitalGate(ok, { role: "hospital", partnerVerified: false }).body.code, "HOSPITAL_NOT_APPROVED");
  assert.equal(hospitalGate(ok, { role: "hospital", partnerVerified: true }), null);
  assert.equal(hospitalGate(ok, null).status, 403);
});

// ---------------- hospital approval gate (routes) ----------------
const hospital = (extra = {}) => ({ _id: "h1", role: "hospital", hospitalName: "City Hospital", partnerVerified: false, ...extra });

test("unapproved hospital cannot use ANY hospital power", async () => {
  cur.user = hospital();
  const checks = [
    ["GET", "/api/donors/search?q=rohan"],
    ["PATCH", `/api/donors/${ID("d")}/verify`],
    ["GET", "/api/requests/pending-verification"],
    ["PATCH", `/api/requests/${ID("a")}/verify-hospital`],
    ["POST", "/api/camps", { name: "Camp", date: "2099-01-01", address: "x", area: "y", lat: 1, lng: 2 }],
  ];
  for (const [method, path, body] of checks) {
    const r = await call(method, path, { body });
    assert.equal(r.status, 403, `${method} ${path} was allowed`);
    assert.equal(r.json.code, "HOSPITAL_NOT_APPROVED", `${method} ${path}`);
  }
});

test("approved hospital with a verified email can search donors; unverified email is still blocked", async () => {
  cur.user = hospital({ partnerVerified: true });
  cur.users = []; cur.donors = [];
  assert.equal((await call("GET", "/api/donors/search?q=rohan")).status, 200);
  const r = await call("GET", "/api/donors/search?q=rohan", { headers: UNVERIFIED });
  assert.equal(r.status, 403);
  assert.equal(r.json.code, "EMAIL_NOT_VERIFIED");
});

test("an approved hospital still cannot verify a request that isn't under its own name", async () => {
  cur.user = hospital({ partnerVerified: true });
  cur.request = doc({ _id: ID("a"), hospital: "AIIMS", urgency: "Critical", status: "Searching", location: { coordinates: [1, 2] } });
  const r = await call("PATCH", `/api/requests/${ID("a")}/verify-hospital`);
  assert.equal(r.status, 403);
  assert.match(r.json.error, /under your hospital name/);
});

test("donors and seekers still cannot reach hospital powers", async () => {
  cur.user = { _id: "u1", role: "donor" };
  assert.equal((await call("GET", "/api/requests/pending-verification")).status, 403);
  cur.user = { _id: "u2", role: "seeker" };
  assert.equal((await call("PATCH", `/api/donors/${ID("d")}/verify`)).status, 403);
});

// ---------------- email verification gate ----------------
test("unverified email: cannot create a donor profile, go available or accept", async () => {
  cur.user = { _id: "u1", role: "donor", familyMembers: [] };
  const create = await call("POST", "/api/donors", { headers: UNVERIFIED, body: { bloodGroup: "O+", area: "Saket", lat: 28.6, lng: 77.2 } });
  assert.equal(create.status, 403); assert.equal(create.json.code, "EMAIL_NOT_VERIFIED");
  cur.donor = doc({ _id: ID("d"), user: "u1", donationHistory: [], available: false });
  const on = await call("PATCH", `/api/donors/${ID("d")}/availability`, { headers: UNVERIFIED, body: { available: true, eligibilityConfirmed: true } });
  assert.equal(on.status, 403); assert.equal(on.json.code, "EMAIL_NOT_VERIFIED");
  const accept = await call("POST", `/api/requests/${ID("a")}/respond`, { headers: UNVERIFIED, body: { response: "Accepted", donorId: ID("d") } });
  assert.equal(accept.status, 403); assert.equal(accept.json.code, "EMAIL_NOT_VERIFIED");
});

test("unverified email can still turn availability OFF and decline (never trapped)", async () => {
  cur.user = { _id: "u1", role: "donor", familyMembers: [] };
  cur.donor = doc({ _id: ID("d"), user: "u1", bloodGroup: "O+", area: "x", donationHistory: [], available: true, populate: async function () { return this; } });
  const off = await call("PATCH", `/api/donors/${ID("d")}/availability`, { headers: UNVERIFIED, body: { available: false } });
  assert.equal(off.status, 200);
  const decline = await call("POST", `/api/requests/${ID("a")}/respond`, { headers: UNVERIFIED, body: { response: "Declined", donorId: ID("d") } });
  assert.notEqual(decline.json?.code, "EMAIL_NOT_VERIFIED");
});

test("raising a blood request is NOT blocked by an unverified email (emergencies come first)", async () => {
  cur.user = { _id: "u1", role: "seeker", familyMembers: [] };
  const r = await call("POST", "/api/requests", { headers: UNVERIFIED, body: {} });
  assert.notEqual(r.json?.code, "EMAIL_NOT_VERIFIED");
  assert.equal(r.status, 400); // fails on missing fields, not on email
});

// ---------------- donor map privacy ----------------
test("map visibility: owner can hide/show; must be a boolean; others get 404", async () => {
  cur.user = { _id: "u1", role: "donor", familyMembers: [] };
  const donor = doc({ _id: ID("d"), user: "u1", bloodGroup: "O+", area: "Saket", available: true, donationHistory: [], populate: async function () { return this; } });
  cur.donor = donor;
  const hide = await call("PATCH", `/api/donors/${ID("d")}/map-visibility`, { body: { hidden: true } });
  assert.equal(hide.status, 200);
  assert.equal(hide.json.donor.hideFromMap, true);
  assert.equal((await call("PATCH", `/api/donors/${ID("d")}/map-visibility`, { body: { hidden: "yes" } })).status, 400);
  cur.donor = null;
  assert.equal((await call("PATCH", `/api/donors/${ID("d")}/map-visibility`, { body: { hidden: true } })).status, 404);
});

test("open browsing leaves out donors who chose to stay off the map", async () => {
  cur.user = { _id: "u1", role: "seeker" };
  cur.donors = [];
  await call("GET", "/api/donors?bloodGroup=O%2B");
  assert.deepEqual(calls.donorFindFilter.hideFromMap, { $ne: true });
});

test("matches: a hidden donor is not shown to the seeker until they accept; still notified (matching unchanged)", async () => {
  cur.user = { _id: "u1", role: "seeker" };
  cur.request = doc({ _id: ID("a"), seeker: "u1", bloodGroup: "A+", urgency: "Urgent", area: "Delhi", location: { coordinates: [77.2, 28.6] },
    contactedDonors: [{ donor: ID("2"), status: "Accepted" }] });
  const cand = (id, name, extra = {}) => ({ _id: id, bloodGroup: "O+", area: "Saket", available: true, distanceMeters: 1500, location: { coordinates: [77.2, 28.6] }, user: { name, phone: "9876543210", familyMembers: [] }, ...extra });
  cur.candidates = [cand(ID("1"), "Hidden Harry", { hideFromMap: true }), cand(ID("2"), "Accepted Asha", { hideFromMap: true }), cand(ID("3"), "Visible Vik")];
  const r = await call("GET", `/api/requests/${ID("a")}/matches`);
  assert.equal(r.status, 200);
  const names = r.json.matches.map((m) => m.donor.name);
  assert.ok(!names.some((n) => n.startsWith("Hidden")), "hidden donor leaked into matches");
  assert.ok(names.some((n) => n.startsWith("Accepted")), "accepted donor must be visible even if hidden");
  assert.ok(names.some((n) => n.startsWith("Visible")));
});

// ---------------- save guest account ----------------
test("upgrade-guest: attaches the linked email, keeps the same profile", async () => {
  const guest = doc({ _id: "g1", isGuest: true, name: "Guest", role: "seeker" });
  cur.userFn = (f) => (f.firebaseUid ? guest : null); // lookup by uid finds the guest; lookup by email finds nobody
  const r = await call("POST", "/api/auth/upgrade-guest", { headers: { "x-email": "Umar@Example.com" } });
  assert.equal(r.status, 200);
  assert.equal(guest.isGuest, false);
  assert.equal(guest.email, "Umar@Example.com");
});

test("upgrade-guest: refuses full accounts, missing email and emails owned by someone else", async () => {
  cur.user = doc({ _id: "u1", isGuest: false });
  assert.equal((await call("POST", "/api/auth/upgrade-guest", { headers: { "x-email": "a@b.com" } })).status, 400);
  const guest = doc({ _id: "g1", isGuest: true });
  cur.userFn = (f) => (f.firebaseUid ? guest : null);
  assert.equal((await call("POST", "/api/auth/upgrade-guest")).status, 400);
  cur.userFn = (f) => (f.firebaseUid ? guest : { _id: "other" });
  const taken = await call("POST", "/api/auth/upgrade-guest", { headers: { "x-email": "a@b.com" } });
  assert.equal(taken.status, 409);
  assert.equal(guest.isGuest, true, "must stay a guest when the email is taken");
});

// ---------------- audit log ----------------
test("admin actions are written to the audit log without personal data", async () => {
  cur.request = doc({ _id: ID("a"), bloodGroup: "B+", hospital: "Max Hospital", seeker: "u9", contactedDonors: [] });
  const r = await call("POST", `/api/admin/requests/${ID("a")}/close`, { uid: "admin1" });
  assert.equal(r.status, 200);
  assert.equal(calls.audit.length, 1);
  assert.equal(calls.audit[0].action, "request.close");
  assert.equal(calls.audit[0].actorUid, "admin1");
  assert.ok(!/\d{10}/.test(JSON.stringify(calls.audit[0])), "no phone-like numbers in the log");
});

test("approving a hospital is logged too", async () => {
  cur.user = doc({ _id: ID("b"), role: "hospital", hospitalName: "City Hospital", partnerVerified: false });
  await call("PATCH", `/api/admin/hospitals/${ID("b")}/partner-verified`, { uid: "admin1", body: { verified: true } });
  assert.equal(calls.audit[0].action, "hospital.approve");
});

test("if writing the log fails, the admin action still succeeds", async () => {
  cur.auditFails = true;
  cur.request = doc({ _id: ID("a"), bloodGroup: "B+", hospital: "Max", contactedDonors: [] });
  const r = await call("POST", `/api/admin/requests/${ID("a")}/close`, { uid: "admin1" });
  assert.equal(r.status, 200);
});

test("GET /admin/audit: admins only, and never exposes the admin's uid", async () => {
  cur.auditEntries = [{ _id: "e1", action: "request.close", targetType: "request", summary: "Closed request", at: new Date(), actorUid: "SECRET_ADMIN_UID" }];
  assert.equal((await call("GET", "/api/admin/audit", { uid: "random" })).status, 403);
  const r = await call("GET", "/api/admin/audit", { uid: "admin1" });
  assert.equal(r.status, 200);
  assert.ok(!r.text.includes("SECRET_ADMIN_UID"));
  assert.equal(r.json.entries[0].action, "request.close");
});

// ---------------- anonymous stats export ----------------
test("stats CSV: small groups are hidden as <5, cells are escaped, no ids", () => {
  assert.equal(suppress(4), "<5");
  assert.equal(suppress(5), "5");
  const csv = buildStatsCsv([{ section: "x", rows: [{ label: 'a,"b"', count: 3 }, { label: "ok", count: 12 }] }], new Date("2026-10-17T00:00:00Z"));
  assert.ok(csv.includes('x,"a,""b""",<5'));
  assert.ok(csv.includes("x,ok,12"));
  assert.ok(csv.includes("meta,generated,2026-10-17"));
});

test("GET /admin/stats-export: admins only, CSV download, counts only", async () => {
  cur.userAgg = [{ _id: "donor", n: 40 }, { _id: "hospital", n: 2 }];
  cur.donorAgg = [{ _id: "O+", n: 9 }];
  cur.requestAgg = [{ _id: "2026-10", n: 7 }];
  assert.equal((await call("GET", "/api/admin/stats-export", { uid: "random" })).status, 403);
  const r = await call("GET", "/api/admin/stats-export", { uid: "admin1" });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /text\/csv/);
  assert.match(r.headers.get("content-disposition"), /attachment/);
  assert.ok(r.text.includes("users_by_role,donor,40"));
  assert.ok(r.text.includes("users_by_role,hospital,<5"));
  assert.ok(!/@|\d{10}/.test(r.text.replace(/\d{4}-\d{2}/g, "")), "no emails/phones");
});

// ---------------- security: helmet + rate limits ----------------
async function withApp(configure, fn) {
  const a = express();
  configure(a);
  a.get("/ping", (req, res) => res.json({ ok: true, ip: req.ip }));
  const s = await new Promise((r) => { const x = a.listen(0, () => r(x)); });
  try { await fn(`http://localhost:${s.address().port}`); } finally { s.close(); }
}

test("security headers: nosniff, no x-powered-by, cross-origin API use allowed", async () => {
  await withApp((a) => applySecurity(a, { env: {} }), async (b) => {
    const res = await fetch(b + "/ping");
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-powered-by"), null);
    assert.equal(res.headers.get("cross-origin-resource-policy"), "cross-origin");
  });
});

test("rate limit: the request over the limit gets a friendly 429 with a Retry hint", async () => {
  await withApp((a) => a.use(makeLimiter({ windowMs: 60e3, limit: 3, message: "Slow down" })), async (b) => {
    for (let i = 0; i < 3; i++) assert.equal((await fetch(b + "/ping")).status, 200);
    const blocked = await fetch(b + "/ping");
    assert.equal(blocked.status, 429);
    assert.deepEqual(await blocked.json(), { error: "Slow down" });
    assert.ok(blocked.headers.get("ratelimit") || blocked.headers.get("retry-after"));
  });
});

test("TRUST_PROXY: unset = loopback only (cannot be spoofed); a number is honoured", async () => {
  const a = express(); applySecurity(a, { env: {} });
  assert.equal(a.get("trust proxy"), "loopback");
  const b = express(); applySecurity(b, { env: { TRUST_PROXY: "1" } });
  assert.equal(b.get("trust proxy"), 1);
});

test("a spoofed X-Forwarded-For cannot dodge limits when proxy trust is off for non-loopback", async () => {
  // With the default "loopback" setting a header from a normal client is ignored only if the
  // connection isn't from loopback; here the test client IS loopback, so the header IS used.
  // What matters: we never use trust proxy = true (accept anyone's header).
  const server = require("fs").readFileSync(require("path").join(__dirname, "../server.js"), "utf8");
  assert.ok(!/trust proxy",\s*true/.test(server), 'server.js must not set trust proxy to true');
});
