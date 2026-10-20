const test = require("node:test");
const assert = require("node:assert/strict");

process.env.ADMIN_UIDS = "admin1";
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
const Donor = require("../models/Donor");
const Request = require("../models/Request");
const Camp = require("../models/Camp");
const RecurringPlan = require("../models/RecurringPlan");
const { compatibleDonorGroupsFor } = require("../utils/bloodCompatibility");
const { inQuietHours, isDonorReachable, parseSchedule } = require("../utils/schedule");
const rules = require("../utils/lifecycleRules");
const { parseRequestExtras } = require("../utils/requestFactory");
const { needsEligibleReminder } = require("../utils/reminders");
const { findRankedDonors } = require("../utils/matching");
const { generateOne } = require("../utils/recurring");
const { releaseRequest } = require("../utils/lifecycle");
const { serializeDonor } = require("../utils/serializers");

const HOUR = 3600e3;
const DAY = 24 * HOUR;
// 23:00 IST on 20 Oct 2026 (17:30 UTC)
const NIGHT = new Date(Date.UTC(2026, 9, 20, 17, 30));
// 12:00 IST (06:30 UTC)
const NOON = new Date(Date.UTC(2026, 9, 20, 6, 30));
const NOW = new Date("2026-10-20T08:00:00Z");

// ---------------- components ----------------
test("platelets match the same group only", () => {
  assert.deepEqual(compatibleDonorGroupsFor("A+", "Platelets"), ["A+"]);
  assert.deepEqual(compatibleDonorGroupsFor("O-", "Platelets"), ["O-"]);
  assert.deepEqual(compatibleDonorGroupsFor("nonsense", "Platelets"), []);
});

test("plasma follows the reverse ABO rule and ignores Rh", () => {
  const set = (g) => [...compatibleDonorGroupsFor(g, "Plasma")].sort();
  assert.deepEqual(set("AB+"), ["AB+", "AB-"]);
  assert.deepEqual(set("A-"), ["A+", "A-", "AB+", "AB-"]);
  assert.deepEqual(set("B+"), ["AB+", "AB-", "B+", "B-"]);
  assert.equal(set("O+").length, 8);
  assert.deepEqual(compatibleDonorGroupsFor("A+"), ["O-", "O+", "A-", "A+"], "whole blood unchanged");
  assert.deepEqual(compatibleDonorGroupsFor("A+", "Whole blood"), ["O-", "O+", "A-", "A+"]);
});

// ---------------- donor schedule ----------------
test("quiet hours work across midnight and in IST", () => {
  const s = { quietHours: { enabled: true, start: "22:00", end: "07:00" } };
  assert.equal(inQuietHours(s, NIGHT), true);   // 23:00 IST
  assert.equal(inQuietHours(s, NOON), false);   // 12:00 IST
  assert.equal(inQuietHours(s, new Date(Date.UTC(2026, 9, 20, 0, 0))), true); // 05:30 IST
  assert.equal(inQuietHours({ quietHours: { enabled: false, start: "22:00", end: "07:00" } }, NIGHT), false);
  assert.equal(inQuietHours({ quietHours: { enabled: true, start: "10:00", end: "10:00" } }, NOON), false, "empty window ignored");
  const day = { quietHours: { enabled: true, start: "13:00", end: "15:00" } };
  assert.equal(inQuietHours(day, new Date(Date.UTC(2026, 9, 20, 8, 30))), true); // 14:00 IST
  assert.equal(inQuietHours(day, NOON), false);
});

test("reachability: emergencies-only and quiet hours", () => {
  const eo = { schedule: { emergenciesOnly: true } };
  assert.equal(isDonorReachable(eo, { urgency: "Normal" }, NOON), false);
  assert.equal(isDonorReachable(eo, { urgency: "Urgent" }, NOON), true);
  assert.equal(isDonorReachable(eo, { urgency: "Critical" }, NOON), true);
  const quiet = { schedule: { quietHours: { enabled: true, start: "22:00", end: "07:00" } } };
  assert.equal(isDonorReachable(quiet, { urgency: "Urgent" }, NIGHT), false);
  assert.equal(isDonorReachable(quiet, { urgency: "Normal" }, NIGHT), false);
  assert.equal(isDonorReachable(quiet, { urgency: "Critical" }, NIGHT), true, "Critical always gets through");
  assert.equal(isDonorReachable(quiet, { urgency: "Normal" }, NOON), true);
  assert.equal(isDonorReachable({}, { urgency: "Normal" }, NIGHT), true, "no preferences = reachable");
});

test("parseSchedule validates input", () => {
  assert.ok(parseSchedule({ emergenciesOnly: "yes" }).error);
  assert.ok(parseSchedule({ quietHours: { enabled: true, start: "25:00", end: "07:00" } }).error);
  assert.ok(parseSchedule({ quietHours: { enabled: true, start: "22:00", end: "22:00" } }).error);
  assert.ok(parseSchedule({ quietHours: { enabled: "x" } }).error);
  assert.deepEqual(parseSchedule({ emergenciesOnly: true, quietHours: { enabled: true, start: "21:30", end: "06:45" } }).value, { emergenciesOnly: true, quietHours: { enabled: true, start: "21:30", end: "06:45" } });
});

// ---------------- plan-ahead rules ----------------
test("parseNeededBy: none, invalid, past, too far", () => {
  assert.deepEqual(rules.parseNeededBy(undefined, NOW), { none: true });
  assert.deepEqual(rules.parseNeededBy("", NOW), { none: true });
  assert.ok(rules.parseNeededBy("not a date", NOW).error);
  assert.ok(rules.parseNeededBy("2026-10-19T08:00:00Z", NOW).error);
  assert.ok(rules.parseNeededBy("2026-12-25T08:00:00Z", NOW).error);
  assert.ok(rules.parseNeededBy("2026-10-25T08:00:00Z", NOW).neededBy instanceof Date);
});

test("requestSchedule: soon = normal request; far = held until 72h before", () => {
  const soon = rules.requestSchedule({ urgency: "Normal", neededBy: new Date(NOW.getTime() + 10 * HOUR), now: NOW });
  assert.equal(soon.planned, false);
  assert.equal(soon.released, true);

  const far = rules.requestSchedule({ urgency: "Normal", neededBy: new Date(NOW.getTime() + 7 * DAY), now: NOW });
  assert.equal(far.planned, true);
  assert.equal(far.released, false);
  assert.equal(far.releaseAt.getTime(), NOW.getTime() + 7 * DAY - 72 * HOUR);
  assert.equal(far.expiresAt.getTime(), NOW.getTime() + 7 * DAY + 12 * HOUR);
  assert.equal(far.nextEscalationAt, null, "no escalation before release");

  const near = rules.requestSchedule({ urgency: "Urgent", neededBy: new Date(NOW.getTime() + 2 * DAY), now: NOW });
  assert.equal(near.planned, true);
  assert.equal(near.released, true, "inside the 72h window: contact donors right away");
  assert.ok(near.nextEscalationAt > NOW);
});

test("an unreleased planned request does not escalate, expire early or nag", () => {
  const r = { status: "Searching", urgency: "Normal", released: false, releaseAt: new Date(NOW.getTime() + 2 * DAY), expiresAt: new Date(NOW.getTime() + 6 * DAY), nextEscalationAt: new Date(NOW.getTime() - 1000), createdAt: NOW };
  assert.equal(rules.shouldEscalate(r, NOW), false);
  const info = rules.lifecycleInfo(r, NOW);
  assert.equal(info.scheduled, true);
  assert.equal(info.showStillNeedPrompt, false);
  assert.equal(info.canExtend, false);
  assert.equal(rules.isReleased({}), true, "old requests count as released");
});

test("parseRequestExtras: component, Critical can't be planned", () => {
  assert.equal(parseRequestExtras({}).component, "Whole blood");
  assert.ok(parseRequestExtras({ component: "Red cells" }).error);
  assert.equal(parseRequestExtras({ component: "Platelets" }).component, "Platelets");
  const later = new Date(Date.now() + 5 * DAY).toISOString();
  assert.ok(parseRequestExtras({ urgency: "Critical", neededBy: later }).error);
  assert.ok(!parseRequestExtras({ urgency: "Urgent", neededBy: later }).error);
});

// ---------------- donate-again reminder ----------------
test("reminder: only after the gap, only when not available, only once per donation", () => {
  const longAgo = new Date(Date.now() - 200 * DAY);
  const recent = new Date(Date.now() - 10 * DAY);
  const base = { sex: "male", available: false, donationHistory: [{ date: longAgo }], eligibleReminderSentAt: null };
  assert.equal(needsEligibleReminder(base), true);
  assert.equal(needsEligibleReminder({ ...base, available: true }), false);
  assert.equal(needsEligibleReminder({ ...base, donationHistory: [] }), false);
  assert.equal(needsEligibleReminder({ ...base, donationHistory: [{ date: recent }] }), false, "still inside the gap");
  assert.equal(needsEligibleReminder({ ...base, eligibleReminderSentAt: new Date() }), false, "already reminded");
  assert.equal(needsEligibleReminder({ ...base, eligibleReminderSentAt: new Date(Date.now() - 300 * DAY) }), true, "reminded for an older donation");
});

test("donor's own view: eligibleAgain nudge + schedule, but hospital view has neither", () => {
  const d = { _id: "d", bloodGroup: "O+", area: "x", available: false, verified: false, sex: "male", donationHistory: [{ date: new Date(Date.now() - 200 * DAY) }], schedule: { emergenciesOnly: true, quietHours: { enabled: true, start: "23:00", end: "06:00" } }, user: { name: "A B", phone: "9876543210", familyMembers: [] } };
  const own = serializeDonor(d, "self");
  assert.equal(own.eligibleAgain, true);
  assert.equal(own.schedule.emergenciesOnly, true);
  assert.equal(own.schedule.quietHours.start, "23:00");
  const hosp = JSON.stringify(serializeDonor(d, "hospital"));
  assert.ok(!hosp.includes("emergenciesOnly") && !hosp.includes("eligibleAgain") && !hosp.includes("quietHours"));
});

// ---------------- matching respects schedules ----------------
test("findRankedDonors: schedule only applies when contacting; component changes who matches", async () => {
  let lastQuery = null;
  Donor.aggregate = async (pipe) => { lastQuery = pipe[0].$geoNear.query; return cur.candidates; };
  Donor.populate = async (c) => c;
  const mk = (id, extra) => ({ _id: id, bloodGroup: "O+", available: true, donationHistory: [], user: {}, ...extra });
  const cur = { candidates: [
    mk("quiet", { schedule: { quietHours: { enabled: true, start: "22:00", end: "07:00" } } }),
    mk("eo", { schedule: { emergenciesOnly: true } }),
    mk("free", {}),
  ] };
  const req = { bloodGroup: "A+", urgency: "Normal", location: { coordinates: [1, 2] } };
  const browsing = await findRankedDonors(req, 10);
  assert.equal(browsing.donors.length, 3, "seeker's nearby list shows everyone");
  const contacting = await findRankedDonors(req, 10, { respectSchedule: true, now: NIGHT });
  assert.deepEqual(contacting.donors.map((d) => d._id), ["free"]);
  const crit = await findRankedDonors({ ...req, urgency: "Critical" }, 10, { respectSchedule: true, now: NIGHT });
  assert.equal(crit.donors.length, 3, "Critical reaches everyone");
  await findRankedDonors({ ...req, component: "Platelets" }, 10);
  assert.deepEqual(lastQuery.bloodGroup.$in, ["A+"]);
});

// ---------------- releasing planned requests ----------------
test("releaseRequest: only when due, only once, then contacts donors", async () => {
  Donor.aggregate = async () => [];
  Donor.populate = async (c) => c;
  const doc = { _id: "r1", released: false, releaseAt: new Date(NOW.getTime() - 1000), status: "Searching", urgency: "Normal", bloodGroup: "A+", location: { coordinates: [1, 2] } };
  let claimedWith = null;
  Request.findOneAndUpdate = async (filter, update) => { claimedWith = { filter, update }; return { ...doc, released: true, contactedDonors: [] }; };
  const ok = await releaseRequest(doc, NOW);
  assert.equal(ok.released, true);
  assert.equal(claimedWith.filter.released, false, "compare-and-swap on released:false");
  assert.equal(claimedWith.update.$set.released, true);
  assert.ok(claimedWith.update.$set.nextEscalationAt > NOW);

  claimedWith = null;
  assert.equal((await releaseRequest({ ...doc, releaseAt: new Date(NOW.getTime() + HOUR) }, NOW)).released, false, "not due yet");
  assert.equal(claimedWith, null);
  assert.equal((await releaseRequest({ ...doc, released: true }, NOW)).released, false, "already released");
  Request.findOneAndUpdate = async () => null;
  assert.equal((await releaseRequest(doc, NOW)).released, false, "lost the race");
});

// ---------------- recurring plans ----------------
const plan = (extra = {}) => ({ _id: "p1", seeker: "s1", familyMemberId: null, bloodGroup: "B+", component: "Whole blood", units: 1, hospital: "City Hospital", area: "Delhi", location: { coordinates: [77.2, 28.6] }, everyWeeks: 3, nextNeededAt: new Date(NOW.getTime() + 5 * DAY), notes: "", ...extra });

test("recurring: due occurrence becomes ONE planned request and the plan moves forward", async () => {
  const p = plan();
  let advancedTo = null;
  RecurringPlan.findOneAndUpdate = async (filter, update) => { advancedTo = update.$set.nextNeededAt; return p; };
  User.findById = async () => ({ _id: "s1", role: "seeker", isGuest: false, name: "Seeker", email: null, familyMembers: { id: () => null } });
  const created = [];
  Request.create = async (d) => { created.push(d); return { ...d, _id: "r9", save: async () => {} }; };
  Donor.aggregate = async () => [];
  Donor.populate = async (c) => c;
  const ok = await generateOne(p, NOW);
  assert.equal(ok, true);
  assert.equal(created.length, 1);
  assert.equal(created[0].urgency, "Normal");
  assert.equal(created[0].neededBy.getTime(), p.nextNeededAt.getTime());
  assert.equal(String(created[0].recurringPlan), "p1");
  assert.equal(created[0].released, false, "5 days away: held until 72h before");
  assert.equal(advancedTo.getTime(), p.nextNeededAt.getTime() + 21 * DAY);
});

test("recurring: lost race, missed occurrence, guest and blocked accounts create nothing", async () => {
  let creates = 0;
  Request.create = async () => { creates++; return { save: async () => {} }; };
  const p = plan();
  RecurringPlan.findOneAndUpdate = async () => null;
  assert.equal(await generateOne(p, NOW), false);
  RecurringPlan.findOneAndUpdate = async () => p;
  assert.equal(await generateOne(plan({ nextNeededAt: new Date(NOW.getTime() - DAY) }), NOW), false, "missed while asleep");
  User.findById = async () => ({ role: "seeker", isGuest: true });
  assert.equal(await generateOne(p, NOW), false);
  User.findById = async () => ({ role: "seeker", isGuest: false, throttledUntil: new Date(NOW.getTime() + DAY) });
  assert.equal(await generateOne(p, NOW), false);
  assert.equal(creates, 0);
});

// ---------------- routes ----------------
const q = (result) => { const o = { populate: () => o, sort: () => o, limit: () => o, select: () => o, then: (a, b) => Promise.resolve(result).then(a, b) }; return o; };
const st = {};
User.findOne = () => q(st.user);
Donor.findOne = () => q(st.donor);
Donor.updateMany = async (f, u) => { st.updateMany = { f, u }; return { modifiedCount: f._id.$in.length }; };
Request.countDocuments = async () => 0;
RecurringPlan.find = () => q(st.plans || []);
RecurringPlan.findOne = () => q(st.plan);
RecurringPlan.countDocuments = async () => st.activeCount || 0;
RecurringPlan.create = async (d) => ({ ...d, _id: "pp1", createdAt: new Date() });
Camp.findOne = () => q(st.camp);

const app = express();
app.use(express.json());
app.use("/api/requests", require("../routes/requests"));
app.use("/api/donors", require("../routes/donors"));
app.use("/api/camps", require("../routes/camps"));
app.use("/api/recurring", require("../routes/recurring"));

let server, base;
test.before(async () => { await new Promise((r) => (server = app.listen(0, r))); base = `http://localhost:${server.address().port}`; });
test.after(() => server.close());
test.beforeEach(() => { for (const k of Object.keys(st)) delete st[k]; });

const call = async (method, path, { body, headers = {}, uid = "u" } = {}) => {
  const res = await fetch(base + path, { method, headers: { "content-type": "application/json", ...(uid ? { "x-uid": uid } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { /* */ }
  return { status: res.status, text, json };
};
const ID = (c) => c.repeat(24);
const doc = (o) => ({ ...o, save: async function () { return this; }, deleteOne: async function () { return this; }, toObject: function () { return { ...this }; } });
const seeker = (extra = {}) => ({ _id: "s1", role: "seeker", name: "Seeker", isGuest: false, familyMembers: { id: () => null }, ...extra });

const reqBody = (extra = {}) => ({ bloodGroup: "B+", units: 2, hospital: "City Hospital", area: "Delhi", lat: 28.6, lng: 77.2, ...extra });
const captureCreate = () => { const made = []; Request.create = async (d) => { made.push(d); return { status: "Searching", ...d, _id: "r1", contactedDonors: [], save: async function () { return this; } }; }; Donor.aggregate = async () => []; Donor.populate = async (c) => c; return made; };

test("POST /requests: platelets request is saved with its component", async () => {
  st.user = seeker(); const made = captureCreate();
  const r = await call("POST", "/api/requests", { body: reqBody({ component: "Platelets" }) });
  assert.equal(r.status, 201);
  assert.equal(made[0].component, "Platelets");
  assert.equal(r.json.request.component, "Platelets");
});

test("POST /requests: plan-ahead request is held (donors not contacted yet) and shows as scheduled", async () => {
  st.user = seeker(); const made = captureCreate();
  let searched = false; Donor.aggregate = async () => { searched = true; return []; };
  const when = new Date(Date.now() + 7 * DAY).toISOString();
  const r = await call("POST", "/api/requests", { body: reqBody({ neededBy: when, urgency: "Urgent" }) });
  assert.equal(r.status, 201);
  assert.equal(made[0].released, false);
  assert.equal(searched, false, "no donor search before the release time");
  assert.equal(r.json.request.lifecycle.scheduled, true);
  assert.ok(r.json.request.neededBy);
});

test("POST /requests: bad component, past date, Critical+plan-ahead are all rejected", async () => {
  st.user = seeker(); captureCreate();
  assert.equal((await call("POST", "/api/requests", { body: reqBody({ component: "Red cells" }) })).status, 400);
  assert.equal((await call("POST", "/api/requests", { body: reqBody({ neededBy: "2020-01-01T00:00:00Z" }) })).status, 400);
  const later = new Date(Date.now() + 5 * DAY).toISOString();
  assert.equal((await call("POST", "/api/requests", { body: reqBody({ urgency: "Critical", neededBy: later }) })).status, 400);
});

const planBody = (extra = {}) => ({ bloodGroup: "B+", units: 1, hospital: "City Hospital", area: "Delhi", lat: 28.6, lng: 77.2, everyWeeks: 3, firstNeededAt: new Date(Date.now() + 10 * DAY).toISOString(), ...extra });

test("recurring routes: need a full seeker account with a verified email", async () => {
  assert.equal((await call("GET", "/api/recurring", { uid: null })).status, 401);
  st.user = { _id: "u1", role: "donor" };
  assert.equal((await call("GET", "/api/recurring")).status, 403);
  st.user = seeker({ isGuest: true });
  assert.equal((await call("POST", "/api/recurring", { body: planBody() })).status, 403);
  st.user = seeker();
  const unverified = await call("POST", "/api/recurring", { body: planBody(), headers: { "x-unverified": "1" } });
  assert.equal(unverified.status, 403);
  assert.equal(unverified.json.code, "EMAIL_NOT_VERIFIED");
});

test("recurring: valid plan saved; the response never includes coordinates", async () => {
  st.user = seeker();
  const r = await call("POST", "/api/recurring", { body: planBody({ component: "Plasma" }) });
  assert.equal(r.status, 201);
  assert.equal(r.json.plan.component, "Plasma");
  assert.equal(r.json.plan.everyWeeks, 3);
  assert.ok(!r.text.includes("28.6") && !r.text.includes("77.2"), "location leaked");
});

test("recurring: validation (weeks, units, past date, far date, limit of 5)", async () => {
  st.user = seeker();
  assert.equal((await call("POST", "/api/recurring", { body: planBody({ everyWeeks: 0 }) })).status, 400);
  assert.equal((await call("POST", "/api/recurring", { body: planBody({ everyWeeks: 13 }) })).status, 400);
  assert.equal((await call("POST", "/api/recurring", { body: planBody({ units: 0 }) })).status, 400);
  assert.equal((await call("POST", "/api/recurring", { body: planBody({ bloodGroup: "Z+" }) })).status, 400);
  assert.equal((await call("POST", "/api/recurring", { body: planBody({ firstNeededAt: "2020-01-01" }) })).status, 400);
  assert.equal((await call("POST", "/api/recurring", { body: planBody({ firstNeededAt: new Date(Date.now() + 300 * DAY).toISOString() }) })).status, 400);
  st.activeCount = 5;
  assert.equal((await call("POST", "/api/recurring", { body: planBody() })).status, 409);
});

test("recurring: pause, skip next, delete — only your own", async () => {
  st.user = seeker();
  const next = new Date(Date.now() + 5 * DAY);
  st.plan = doc({ _id: ID("a"), seeker: "s1", bloodGroup: "B+", component: "Whole blood", units: 1, hospital: "H", area: "A", everyWeeks: 2, nextNeededAt: next, active: true });
  const paused = await call("PATCH", `/api/recurring/${ID("a")}`, { body: { active: false } });
  assert.equal(paused.json.plan.active, false);
  const skipped = await call("PATCH", `/api/recurring/${ID("a")}`, { body: { skipNext: true } });
  assert.equal(new Date(skipped.json.plan.nextNeededAt).getTime(), next.getTime() + 14 * DAY);
  assert.equal((await call("DELETE", `/api/recurring/${ID("a")}`)).status, 200);
  st.plan = null;
  assert.equal((await call("PATCH", `/api/recurring/${ID("b")}`, { body: { active: false } })).status, 404);
  assert.equal((await call("DELETE", `/api/recurring/nope`)).status, 404);
});

test("PATCH /donors/:id/schedule: owner sets it, bad input rejected, others get 404", async () => {
  st.user = { _id: "u1", role: "donor", familyMembers: [] };
  st.donor = doc({ _id: ID("d"), user: "u1", bloodGroup: "O+", area: "x", donationHistory: [], available: true, populate: async function () { return this; } });
  const ok = await call("PATCH", `/api/donors/${ID("d")}/schedule`, { body: { emergenciesOnly: true, quietHours: { enabled: true, start: "22:00", end: "06:30" } } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.donor.schedule.emergenciesOnly, true);
  assert.equal(ok.json.donor.schedule.quietHours.end, "06:30");
  assert.equal((await call("PATCH", `/api/donors/${ID("d")}/schedule`, { body: { quietHours: { enabled: true, start: "99:00", end: "06:30" } } })).status, 400);
  st.donor = null;
  assert.equal((await call("PATCH", `/api/donors/${ID("d")}/schedule`, { body: { emergenciesOnly: true } })).status, 404);
});

test("PATCH /donors/verify-many: approved hospitals only, max 25, valid ids", async () => {
  st.user = { _id: "h1", role: "hospital", partnerVerified: false };
  const ids = [ID("a"), ID("b")];
  const blocked = await call("PATCH", "/api/donors/verify-many", { body: { donorIds: ids } });
  assert.equal(blocked.status, 403); assert.equal(blocked.json.code, "HOSPITAL_NOT_APPROVED");
  st.user = { _id: "h1", role: "hospital", partnerVerified: true };
  const ok = await call("PATCH", "/api/donors/verify-many", { body: { donorIds: [...ids, ids[0]] } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.requested, 2, "duplicates counted once");
  assert.equal(st.updateMany.u.verified, true);
  assert.equal((await call("PATCH", "/api/donors/verify-many", { body: { donorIds: [] } })).status, 400);
  assert.equal((await call("PATCH", "/api/donors/verify-many", { body: { donorIds: Array.from({ length: 26 }, (_, i) => ID(String(i % 10))) } })).status, 400);
  assert.equal((await call("PATCH", "/api/donors/verify-many", { body: { donorIds: ["nope"] } })).status, 400);
  st.user = { _id: "d1", role: "donor" };
  assert.equal((await call("PATCH", "/api/donors/verify-many", { body: { donorIds: ids } })).status, 403);
});

test("camps: approved hospital edits and deletes ITS OWN camp; unapproved and others cannot", async () => {
  const camp = doc({ _id: ID("c"), hospital: "h1", name: "Camp", address: "Road 1", area: "Delhi", date: new Date(), accessibility: { wheelchairRamp: false, groundFloor: false, accessibleParking: false } });
  st.user = { _id: "h1", role: "hospital", partnerVerified: false };
  st.camp = camp;
  assert.equal((await call("PATCH", `/api/camps/${ID("c")}`, { body: { name: "New" } })).status, 403);
  assert.equal((await call("DELETE", `/api/camps/${ID("c")}`)).status, 403);
  st.user = { _id: "h1", role: "hospital", partnerVerified: true };
  const ok = await call("PATCH", `/api/camps/${ID("c")}`, { body: { name: "Big Camp", accessibility: { wheelchairRamp: true, evil: true }, area: "Noida" } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.camp.name, "Big Camp");
  assert.equal(ok.json.camp.accessibility.wheelchairRamp, true);
  assert.equal(ok.json.camp.accessibility.evil, undefined);
  assert.equal((await call("PATCH", `/api/camps/${ID("c")}`, { body: { name: "" } })).status, 400);
  assert.equal((await call("PATCH", `/api/camps/${ID("c")}`, { body: { date: "garbage" } })).status, 400);
  st.camp = null;
  assert.equal((await call("PATCH", `/api/camps/${ID("c")}`, { body: { name: "X" } })).status, 404);
  assert.equal((await call("DELETE", `/api/camps/${ID("c")}`)).status, 404);
});
