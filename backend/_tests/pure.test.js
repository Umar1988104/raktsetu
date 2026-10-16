const test = require("node:test");
const assert = require("node:assert/strict");
const rules = require("../utils/lifecycleRules");
const S = require("../utils/serializers");
const { computeImpact, computeAreaStats } = require("../utils/impact");

const H = 3600e3, M = 60e3;
const now = new Date("2026-10-12T12:00:00Z");
const ago = (ms) => new Date(now.getTime() - ms);
const ahead = (ms) => new Date(now.getTime() + ms);

// ---------------- lifecycle rules ----------------
test("expiry hours by urgency, with a safe default", () => {
  assert.equal(rules.expiryHoursFor("Critical"), 24);
  assert.equal(rules.expiryHoursFor("Urgent"), 48);
  assert.equal(rules.expiryHoursFor("Normal"), 72);
  assert.equal(rules.expiryHoursFor("???"), 72);
});

test("legacy request without expiresAt gets one from createdAt", () => {
  const r = { urgency: "Urgent", createdAt: ago(10 * H), status: "Searching" };
  assert.equal(rules.effectiveExpiresAt(r).getTime(), ago(10 * H).getTime() + 48 * H);
});

test("only searching/contacted requests time out; confirmed and closed ones never do", () => {
  const old = { urgency: "Normal", createdAt: ago(100 * H), expiresAt: ago(1 * H) };
  assert.equal(rules.isDueToExpire({ ...old, status: "Searching" }, now), true);
  assert.equal(rules.isDueToExpire({ ...old, status: "Contacted" }, now), true);
  assert.equal(rules.isDueToExpire({ ...old, status: "Confirmed" }, now), false);
  assert.equal(rules.isDueToExpire({ ...old, status: "Fulfilled" }, now), false);
  assert.equal(rules.isDueToExpire({ ...old, status: "Expired" }, now), false);
  assert.equal(rules.isDueToExpire({ ...old, status: "Searching", expiresAt: ahead(1 * H) }, now), false);
});

test("'Still need blood?' prompt appears only in the last quarter of the time", () => {
  const base = { urgency: "Urgent", status: "Contacted", extensions: 0 };
  assert.equal(rules.lifecycleInfo({ ...base, expiresAt: ahead(10 * H) }, now).showStillNeedPrompt, true); // 10h <= 12h
  assert.equal(rules.lifecycleInfo({ ...base, expiresAt: ahead(20 * H) }, now).showStillNeedPrompt, false);
  assert.equal(rules.lifecycleInfo({ ...base, status: "Fulfilled", expiresAt: ahead(1 * H) }, now).showStillNeedPrompt, false);
  assert.equal(rules.lifecycleInfo({ ...base, status: "Fulfilled", expiresAt: ahead(1 * H) }, now).closesAt, null);
});

test("a request can be extended at most twice", () => {
  const r = { urgency: "Normal", status: "Searching", expiresAt: ahead(5 * H) };
  assert.equal(rules.lifecycleInfo({ ...r, extensions: 0 }, now).canExtend, true);
  assert.equal(rules.lifecycleInfo({ ...r, extensions: 1 }, now).canExtend, true);
  assert.equal(rules.lifecycleInfo({ ...r, extensions: 2 }, now).canExtend, false);
});

test("escalation: fires only when every condition holds", () => {
  const ok = {
    status: "Contacted", urgency: "Urgent", hospitalVerified: false, escalationRound: 0,
    expiresAt: ahead(10 * H), nextEscalationAt: ago(1 * M),
    contactedDonors: [{ donor: "a", status: "Pending" }, { donor: "b", status: "Declined" }],
  };
  assert.equal(rules.shouldEscalate(ok, now), true);
  assert.equal(rules.shouldEscalate({ ...ok, contactedDonors: [{ donor: "a", status: "Accepted" }] }, now), false, "someone accepted");
  assert.equal(rules.shouldEscalate({ ...ok, urgency: "Critical", hospitalVerified: false }, now), false, "critical but unverified");
  assert.equal(rules.shouldEscalate({ ...ok, urgency: "Critical", hospitalVerified: true }, now), true, "critical and verified");
  assert.equal(rules.shouldEscalate({ ...ok, escalationRound: 3 }, now), false, "rounds used up");
  assert.equal(rules.shouldEscalate({ ...ok, nextEscalationAt: ahead(5 * M) }, now), false, "not due yet");
  assert.equal(rules.shouldEscalate({ ...ok, nextEscalationAt: null }, now), false, "no schedule");
  assert.equal(rules.shouldEscalate({ ...ok, expiresAt: ago(1 * M) }, now), false, "already timed out");
  assert.equal(rules.shouldEscalate({ ...ok, status: "Confirmed" }, now), false);
});

test("escalation batch skips donors already contacted and respects the size", () => {
  const ranked = ["d1", "d2", "d3", "d4", "d5"].map((id) => ({ _id: id }));
  const req = { contactedDonors: [{ donor: "d1" }, { donor: { _id: "d2" } }] };
  assert.deepEqual(rules.pickEscalationBatch(ranked, req, 2).map((d) => d._id), ["d3", "d4"]);
  assert.deepEqual(rules.pickEscalationBatch(ranked, req, 10).map((d) => d._id), ["d3", "d4", "d5"]);
});

test("schedules: first escalation is scheduled, and the last round clears it", () => {
  const s = rules.initialSchedule("Critical", now);
  assert.equal(s.expiresAt.getTime(), now.getTime() + 24 * H);
  assert.equal(s.nextEscalationAt.getTime(), now.getTime() + 15 * M);
  assert.notEqual(rules.nextEscalationAfterRound("Urgent", 2, now), null);
  assert.equal(rules.nextEscalationAfterRound("Urgent", 3, now), null);
});

// ---------------- serializers: nothing sensitive may leak ----------------
const SECRETS = ["9876543210", "secret@mail.com", "FCM_TOKEN_XYZ", "28.61391", "77.20902", "1.2.3.4", "SHARE_TOKEN", "REPORTER_ID"];
const noLeak = (obj, allowed = []) => {
  const json = JSON.stringify(obj);
  for (const s of SECRETS.filter((x) => !allowed.includes(x))) assert.ok(!json.includes(s), `LEAKED ${s} in ${json}`);
};

const rawDonor = () => ({
  _id: "donor1", bloodGroup: "O+", area: "Saket", available: true, verified: true, isDemo: false,
  fcmTokens: ["FCM_TOKEN_XYZ"], sex: "female", familyMemberId: null,
  location: { type: "Point", coordinates: [77.20902, 28.61391] },
  donationHistory: [{ _id: "h1", date: ago(5 * H), requestId: "r9" }],
  user: { name: "Rohan Sharma", phone: "9876543210", email: "secret@mail.com", photo: "x", address: "y", alternatePhone: "9000000001", familyMembers: [] },
});

test("public donor view: short name, masked phone, no email/token/location", () => {
  const v = S.serializeDonor(rawDonor(), "public");
  assert.equal(v.display.name, "Rohan S.");
  assert.equal(v.display.phone, "••••••3210");
  noLeak(v);
  assert.equal(v.location, undefined);
});

test("hospital view: full name & phone, but still no email/token/location", () => {
  const v = S.serializeDonor(rawDonor(), "hospital");
  assert.equal(v.display.name, "Rohan Sharma");
  assert.equal(v.display.phone, "9876543210");
  noLeak(v, ["9876543210"]);
});

test("self view: includes own location/history/sex, never push tokens or email", () => {
  const v = S.serializeDonor(rawDonor(), "self");
  assert.deepEqual(v.location.coordinates, [77.20902, 28.61391]);
  assert.equal(v.sex, "female");
  assert.equal(v.donationHistory.length, 1);
  assert.equal(v.donationHistory[0].requestId, undefined);
  noLeak(v, ["9876543210", "28.61391", "77.20902"]);
});

test("family-member donor shows the family member, not the account holder", () => {
  const d = rawDonor();
  d.familyMemberId = "fm1";
  d.user.familyMembers = [{ _id: "fm1", name: "Meera Sharma", relation: "Mother", phone: "9111111111" }];
  assert.equal(S.serializeDonor(d, "public").display.name, "Meera S.");
  assert.equal(S.serializeDonor(d, "hospital").display.relation, "Mother");
});

test("what a donor may see about the seeker: phone only after accepting", () => {
  const seeker = { name: "Asha Verma", phone: "9876543210" };
  assert.deepEqual(S.serializeSeekerForDonor(seeker, false), { name: "Asha V.", phone: null });
  assert.deepEqual(S.serializeSeekerForDonor(seeker, true), { name: "Asha Verma", phone: "9876543210" });
});

const rawRequest = () => ({
  _id: "req1", status: "Contacted", bloodGroup: "A+", units: 2, urgency: "Urgent", hospital: "AIIMS", area: "Ansari Nagar",
  seeker: "SEEKER_INTERNAL_ID", creatorIp: "1.2.3.4", shareToken: "SHARE_TOKEN", reportedBy: ["REPORTER_ID"],
  hospitalVerified: false, extensions: 0, expiresAt: ahead(40 * H), createdAt: ago(1 * H), updatedAt: ago(1 * M),
  location: { coordinates: [77.20902, 28.61391] },
  thankYouNote: { message: "Thanks", sentAt: ago(1 * M) },
  contactedDonors: [
    { _id: "c1", status: "Pending", notifiedAt: ago(1 * H), donor: { _id: "donor1", fcmTokens: ["FCM_TOKEN_XYZ"], location: { coordinates: [77.20902, 28.61391] }, user: { name: "Rohan Sharma", phone: "9876543210", email: "secret@mail.com", familyMembers: [] } } },
    { _id: "c2", status: "Accepted", notifiedAt: ago(1 * H), respondedAt: ago(30 * M), donor: { _id: "donor2", user: { name: "Meera Iyer", phone: "9876543211", familyMembers: [] } } },
  ],
});

test("owner's request view hides IP, reports, share token, internal ids and donor secrets", () => {
  const v = S.serializeRequestForOwner(rawRequest(), now);
  noLeak(v);
  assert.equal(v.seeker, undefined);
  assert.equal(v.creatorIp, undefined);
  assert.equal(v.reportedBy, undefined);
  assert.ok(v.lifecycle);
});

test("seeker sees a pending donor only as 'Rohan S.' but an accepted donor in full", () => {
  const v = S.serializeRequestForOwner(rawRequest(), now);
  const pending = v.contactedDonors.find((c) => c.status === "Pending");
  const accepted = v.contactedDonors.find((c) => c.status === "Accepted");
  assert.deepEqual(pending.donorDisplay, { name: "Rohan S.", relation: null, phone: null });
  assert.equal(accepted.donorDisplay.name, "Meera Iyer");
  assert.equal(accepted.donorDisplay.phone, "9876543211");
  assert.equal(pending.donor, undefined, "raw donor record must not be returned");
});

test("hospital's request view has the requester contact but not IP or donor data", () => {
  const r = rawRequest();
  r.seeker = { name: "Asha Verma", phone: "9000000002" };
  const v = S.serializeRequestForHospital(r);
  assert.equal(v.seeker.phone, "9000000002");
  noLeak(v);
  assert.equal(v.contactedDonors, undefined);
});

test("matches: pins are rounded to ~1km; name/phone masked until accepted", () => {
  const d = { ...rawDonor(), distanceMeters: 2345 };
  const locked = S.serializeMatch(d, { accepted: false });
  assert.deepEqual(locked.coordinates, [77.21, 28.61]);
  assert.equal(locked.donor.phone, null);
  assert.equal(locked.donor.name, "Rohan S.");
  assert.equal(locked.distanceKm, 2.3);
  noLeak(locked);
  const open = S.serializeMatch(d, { accepted: true });
  assert.equal(open.donor.phone, "9876543210");
});

// ---------------- impact metrics ----------------
test("impact metrics are computed correctly, with sample sizes", () => {
  const req = (o) => ({ reportedFake: false, contactedDonors: [], ...o });
  const requests = [
    req({ urgency: "Urgent", status: "Fulfilled", createdAt: ago(60 * M), contactedDonors: [{ status: "Accepted", respondedAt: ago(50 * M) }] }), // accept at +10m
    req({ urgency: "Urgent", status: "Expired", closedReason: "Timed out", createdAt: ago(60 * M), contactedDonors: [{ status: "Pending" }] }),
    req({ urgency: "Critical", status: "Contacted", createdAt: ago(10 * M) }), // too new to judge
    req({ urgency: "Normal", status: "Fulfilled", createdAt: ago(300 * M), contactedDonors: [{ status: "Accepted", respondedAt: ago(296 * M) }] }), // +4m
    req({ urgency: "Normal", status: "Expired", closedReason: "Closed by requester", createdAt: ago(300 * M), contactedDonors: [{ status: "Declined", respondedAt: ago(280 * M) }] }), // +20m reply
    req({ urgency: "Urgent", status: "Expired", reportedFake: true, createdAt: ago(60 * M) }), // excluded
  ];
  const m = computeImpact(requests, now);
  assert.equal(m.totalRequests, 5);
  assert.equal(m.removedAsFake, 1);
  assert.equal(m.responseTime.repliedSample, 3);
  assert.equal(m.responseTime.avgFirstReplyMinutes, 11.3);
  assert.equal(m.responseTime.medianFirstReplyMinutes, 10);
  assert.equal(m.responseTime.acceptedSample, 2);
  assert.equal(m.responseTime.avgFirstAcceptMinutes, 7);
  assert.equal(m.urgentCoverage.eligible, 2, "the 10-minute-old critical request is not judged yet");
  assert.equal(m.urgentCoverage.acceptedWithinWindow, 1);
  assert.equal(m.urgentCoverage.percent, 50);
  assert.deepEqual([m.outcomes.fulfilled, m.outcomes.expired, m.outcomes.open], [2, 2, 1]);
  assert.equal(m.outcomes.fulfilmentRate, 50);
  assert.deepEqual(m.outcomes.expiredBreakdown, { "Timed out": 1, "Closed by requester": 1 });
});

test("impact with no data returns nulls, never fake numbers", () => {
  const m = computeImpact([], now);
  assert.equal(m.responseTime.avgFirstReplyMinutes, null);
  assert.equal(m.urgentCoverage.percent, null);
  assert.equal(m.outcomes.fulfilmentRate, null);
});

test("donors per area ignore capitalisation and spacing, busiest first", () => {
  const out = computeAreaStats([
    { area: "Saket", available: true, verified: true }, { area: " saket ", available: false, verified: false },
    { area: "Dwarka  Sector 10", available: true, verified: false }, { area: "", available: true },
  ]);
  assert.deepEqual(out[0], { area: "Saket", total: 2, available: 1, verified: 1 });
  assert.equal(out.length, 2);
});
