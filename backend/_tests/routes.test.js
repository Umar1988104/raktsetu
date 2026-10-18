const test = require("node:test");
const assert = require("node:assert/strict");

process.env.ADMIN_UIDS = "admin1";
// Stand-in for Firebase login: whoever sends x-uid is "logged in" as that uid.
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
const Request = require("../models/Request");
const Camp = require("../models/Camp");

// A fake Mongoose query: every chain method returns itself; awaiting gives `result`.
const q = (result) => {
  const o = { populate: () => o, sort: () => o, limit: () => o, select: () => o, lean: () => o, then: (a, b) => Promise.resolve(result).then(a, b) };
  return o;
};
const cur = {};
User.findOne = () => q(cur.user);
Donor.find = () => q(cur.donors);
Donor.findOne = () => q(cur.donor);
Donor.aggregate = async () => cur.candidates;
Donor.populate = async (c) => c;
Request.find = () => q(cur.requests);
Request.findOne = () => q(cur.request);
Request.findById = () => q(cur.request);
Request.updateMany = async () => ({ modifiedCount: 0 });
Request.updateOne = async () => ({});
Request.countDocuments = async () => 3;
User.countDocuments = async () => 2;

const app = express();
app.use(express.json());
app.use("/api/requests", require("../routes/requests"));
app.use("/api/donors", require("../routes/donors"));
app.use("/api/admin", require("../routes/admin"));

let server, base;
test.before(async () => { await new Promise((r) => (server = app.listen(0, r))); base = `http://localhost:${server.address().port}`; });
test.after(() => server.close());

const call = async (method, path, { uid = "u", body } = {}) => {
  const res = await fetch(base + path, { method, headers: { "content-type": "application/json", ...(uid ? { "x-uid": uid } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  return { status: res.status, text, json: text ? JSON.parse(text) : null };
};

const H = 3600e3, M = 60e3;
const ahead = (ms) => new Date(Date.now() + ms);
const ago = (ms) => new Date(Date.now() - ms);
const ID = (c) => c.repeat(24); // valid 24-hex ids
const SECRETS = ["9876543210", "secret@mail.com", "FCM_TOKEN_XYZ", "1.2.3.4", "SHARE_TOKEN", "REPORTER_ID"];
const assertNoLeak = (text, allowed = []) => { for (const s of SECRETS.filter((x) => !allowed.includes(x))) assert.ok(!text.includes(s), `LEAKED ${s}`); };

const rawUser = (extra = {}) => ({ name: "Rohan Sharma", phone: "9876543210", email: "secret@mail.com", familyMembers: [], ...extra });
const doc = (o) => ({ ...o, save: async function () { return this; } }); // minimal saveable document

// ---------------- privacy ----------------
test("GET /donors (open browsing): no raw phone, email, token or exact location", async () => {
  cur.user = { _id: "u1", role: "seeker" };
  cur.donors = [{ _id: ID("d"), bloodGroup: "O+", area: "Saket", available: true, verified: true, fcmTokens: ["FCM_TOKEN_XYZ"], location: { coordinates: [77.20902, 28.61391] }, user: rawUser() }];
  const r = await call("GET", "/api/donors");
  assert.equal(r.status, 200);
  assertNoLeak(r.text);
  assert.ok(!r.text.includes("28.61391") && !r.text.includes("77.20902"), "exact location leaked");
  assert.equal(r.json.donors[0].display.name, "Rohan S.");
  assert.equal(r.json.donors[0].display.phone, "••••••3210");
});

test("GET /requests/me: contacted donors are masked, no raw donor records", async () => {
  cur.user = { _id: "u1", role: "seeker" };
  cur.requests = [{
    _id: ID("a"), status: "Contacted", bloodGroup: "A+", units: 1, urgency: "Urgent", hospital: "AIIMS", area: "Delhi",
    creatorIp: "1.2.3.4", shareToken: "SHARE_TOKEN", reportedBy: ["REPORTER_ID"], expiresAt: ahead(30 * H), createdAt: ago(1 * H),
    contactedDonors: [
      { _id: "c1", status: "Pending", donor: { _id: "d1", fcmTokens: ["FCM_TOKEN_XYZ"], location: { coordinates: [77.20902, 28.61391] }, user: rawUser() } },
      { _id: "c2", status: "Accepted", respondedAt: new Date(), donor: { _id: "d2", user: rawUser({ name: "Meera Iyer", phone: "9111111111" }) } },
    ],
  }];
  const r = await call("GET", "/api/requests/me");
  assert.equal(r.status, 200);
  assertNoLeak(r.text);
  assert.ok(!r.text.includes("28.61391"), "donor location leaked");
  const cd = r.json.requests[0].contactedDonors;
  assert.deepEqual(cd[0].donorDisplay, { name: "Rohan S.", relation: null, phone: null });
  assert.equal(cd[1].donorDisplay.phone, "9111111111", "accepted donor's phone is shown");
});

test("GET /requests/:id: same protections on the single-request view", async () => {
  cur.user = { _id: "u1", role: "seeker" };
  cur.request = doc({
    _id: ID("a"), status: "Contacted", bloodGroup: "A+", units: 1, urgency: "Urgent", hospital: "AIIMS", area: "Delhi", seeker: "u1",
    creatorIp: "1.2.3.4", shareToken: "SHARE_TOKEN", reportedBy: ["REPORTER_ID"], expiresAt: ahead(30 * H), createdAt: ago(1 * H), escalationRound: 0,
    contactedDonors: [{ _id: "c1", status: "Pending", donor: { _id: "d1", fcmTokens: ["FCM_TOKEN_XYZ"], user: rawUser() } }],
  });
  const r = await call("GET", `/api/requests/${ID("a")}`);
  assert.equal(r.status, 200);
  assertNoLeak(r.text);
  assert.ok(r.json.request.lifecycle);
});

test("matches: phone and full name appear only for the donor who accepted", async () => {
  cur.user = { _id: "u1", role: "seeker" };
  cur.request = doc({
    _id: ID("a"), seeker: "u1", bloodGroup: "A+", urgency: "Urgent", area: "Delhi", location: { coordinates: [77.2, 28.6] },
    contactedDonors: [{ donor: ID("1"), status: "Accepted" }, { donor: ID("2"), status: "Pending" }],
  });
  const cand = (id, user) => ({ _id: id, bloodGroup: "O+", area: "Saket", available: true, verified: false, fcmTokens: ["FCM_TOKEN_XYZ"], distanceMeters: 1500, location: { coordinates: [77.20902, 28.61391] }, user });
  cur.candidates = [cand(ID("1"), rawUser({ name: "Meera Iyer", phone: "9111111111" })), cand(ID("2"), rawUser())];
  const r = await call("GET", `/api/requests/${ID("a")}/matches`);
  assert.equal(r.status, 200);
  const [accepted, pending] = r.json.matches;
  assert.equal(accepted.donor.phone, "9111111111");
  assert.equal(pending.donor.phone, null);
  assert.equal(pending.donor.name, "Rohan S.");
  assertNoLeak(r.text);
  assert.deepEqual(pending.coordinates, [77.21, 28.61], "pins are rounded to ~1km");
});

test("donor inbox: requester's phone is hidden until the donor accepts", async () => {
  cur.user = { _id: "u9", role: "donor", name: "Donor", familyMembers: [] };
  cur.donors = [{ _id: ID("1"), user: "u9", familyMemberId: null }];
  const mkReq = (status, state) => [{
    _id: ID("r"), bloodGroup: "A+", units: 1, urgency: "Urgent", hospital: "AIIMS", area: "Delhi", status, thankYouNote: null,
    seeker: { name: "Asha Verma", phone: "9000000002" }, contactedDonors: [{ donor: ID("1"), status: state, notifiedAt: new Date() }],
  }];
  cur.requests = mkReq("Contacted", "Pending");
  let r = await call("GET", "/api/donors/me/incoming-requests");
  assert.deepEqual(r.json.incoming[0].seeker, { name: "Asha V.", phone: null });
  assert.equal(r.json.incoming[0].closed, false);

  cur.requests = mkReq("Confirmed", "Accepted");
  r = await call("GET", "/api/donors/me/incoming-requests");
  assert.deepEqual(r.json.incoming[0].seeker, { name: "Asha Verma", phone: "9000000002" });

  cur.requests = mkReq("Expired", "Pending");
  r = await call("GET", "/api/donors/me/incoming-requests");
  assert.equal(r.json.incoming[0].closed, true, "expired requests are marked closed");
});

// ---------------- admin gate ----------------
test("admin endpoints: 401 without login, 403 for normal users, 200 for admins", async () => {
  assert.equal((await call("GET", "/api/admin/overview", { uid: null })).status, 401);
  assert.equal((await call("GET", "/api/admin/overview", { uid: "someone-else" })).status, 403);
  const ok = await call("GET", "/api/admin/overview", { uid: "admin1" });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.users.donors, 2);
  assert.equal((await call("POST", `/api/admin/requests/${ID("a")}/close`, { uid: "someone-else" })).status, 403);
});

// ---------------- lifecycle endpoints ----------------
const seekerReq = (o) => { cur.user = { _id: "u1", role: "seeker" }; cur.request = doc({ _id: ID("a"), seeker: "u1", bloodGroup: "A+", units: 1, urgency: "Urgent", hospital: "AIIMS", area: "Delhi", hospitalVerified: false, extensions: 0, escalationRound: 2, contactedDonors: [], expiresAt: ahead(2 * H), createdAt: ago(46 * H), ...o }); return cur.request; };

test("extend: reopens the clock and search rounds, but only twice", async () => {
  const r1 = seekerReq({ status: "Contacted", extensions: 0 });
  const before = r1.expiresAt.getTime();
  let r = await call("POST", `/api/requests/${ID("a")}/extend`);
  assert.equal(r.status, 200);
  assert.equal(r1.extensions, 1);
  assert.equal(r1.escalationRound, 0);
  assert.ok(r1.expiresAt.getTime() > before + 40 * H);
  assert.ok(r1.nextEscalationAt, "searching resumes");

  seekerReq({ status: "Contacted", extensions: 2 });
  r = await call("POST", `/api/requests/${ID("a")}/extend`);
  assert.equal(r.status, 409);
});

test("close ('no longer needed'): marks it closed by the requester", async () => {
  const r1 = seekerReq({ status: "Contacted" });
  const r = await call("POST", `/api/requests/${ID("a")}/close`);
  assert.equal(r.status, 200);
  assert.equal(r1.status, "Expired");
  assert.equal(r1.closedReason, "Closed by requester");
  assert.equal(r1.nextEscalationAt, null);
  seekerReq({ status: "Expired" });
  assert.equal((await call("POST", `/api/requests/${ID("a")}/close`)).status, 409);
});

test("status: can't be Fulfilled twice (no duplicate donation logs) or bypass hospital verification", async () => {
  seekerReq({ status: "Fulfilled" });
  assert.equal((await call("PATCH", `/api/requests/${ID("a")}/status`, { body: { status: "Fulfilled" } })).status, 409);
  seekerReq({ status: "Contacted", urgency: "Critical", hospitalVerified: false });
  assert.equal((await call("PATCH", `/api/requests/${ID("a")}/status`, { body: { status: "Fulfilled" } })).status, 403);
  seekerReq({ status: "Contacted" });
  assert.equal((await call("PATCH", `/api/requests/${ID("a")}/status`, { body: { status: "Searching" } })).status, 400, "seekers can't set arbitrary statuses");
});

test("a donor can't answer a request that has already closed", async () => {
  cur.user = { _id: "u9", role: "donor" };
  cur.donor = { _id: ID("1"), user: "u9" };
  cur.request = doc({ _id: ID("a"), status: "Expired", contactedDonors: [{ donor: ID("1"), status: "Pending" }] });
  const r = await call("POST", `/api/requests/${ID("a")}/respond`, { body: { response: "Accepted", donorId: ID("1") } });
  assert.equal(r.status, 409);
});

test("responding returns a minimal reply — never the whole request record", async () => {
  cur.user = { _id: "u9", role: "donor" };
  cur.donor = { _id: ID("1"), user: "u9" };
  const entry = { donor: ID("1"), status: "Pending" };
  cur.request = doc({ _id: ID("a"), status: "Contacted", creatorIp: "1.2.3.4", shareToken: "SHARE_TOKEN", contactedDonors: [entry] });
  const r = await call("POST", `/api/requests/${ID("a")}/respond`, { body: { response: "Accepted", donorId: ID("1") } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { ok: true, myResponse: "Accepted" });
  assert.equal(cur.request.status, "Confirmed");
  assert.equal(cur.request.nextEscalationAt, null, "searching stops once someone accepts");
});

// ---------------- demo seeder ----------------
test("demo data: valid against the real schemas, internally consistent, clearly labelled", async () => {
  const { buildDemoData } = require("../seed-demo");
  const d = buildDemoData();
  const all = [...d.users, ...d.donors, ...d.camps, ...d.requests];
  assert.ok(all.every((x) => x.isDemo === true), "every record is flagged isDemo");
  assert.ok(d.users.every((u) => /^Demo /.test(u.name) && u.email.endsWith("@example.invalid")), "names/emails are obviously fake");

  // Same shape checks the database would do (placeholder phones are intentionally not real numbers).
  for (const u of d.users) await new User({ ...u, phone: "9876543210" }).validate();
  for (const x of d.donors) await new Donor(x).validate();
  for (const x of d.camps) await new Camp(x).validate();
  for (const x of d.requests) await new Request(x).validate();

  const userIds = new Set(d.users.map((u) => String(u._id)));
  const donorIds = new Set(d.donors.map((x) => String(x._id)));
  assert.ok(d.donors.every((x) => userIds.has(String(x.user))));
  assert.ok(d.requests.every((r) => r.contactedDonors.every((c) => donorIds.has(String(c.donor)))));
  assert.ok(d.camps.every((c) => userIds.has(String(c.hospital)) && c.date > new Date()));

  const { computeImpact } = require("../utils/impact");
  const m = computeImpact(d.requests);
  assert.ok(m.responseTime.avgFirstAcceptMinutes > 0);
  assert.ok(m.urgentCoverage.percent !== null);
  assert.ok(m.outcomes.fulfilmentRate !== null);
});
