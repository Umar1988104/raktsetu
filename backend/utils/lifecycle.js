// The database side of the request lifecycle: timing out old requests and
// widening the search when nobody accepts. The decisions themselves live in
// lifecycleRules.js; this file just applies them.

const Request = require("../models/Request");
const rules = require("./lifecycleRules");
const { findRankedDonors } = require("./matching");
const { contactDonors } = require("./notify");
const { contactFirstBatch } = require("./requestFactory");

const LIFECYCLE_FIELDS =
  "status urgency createdAt expiresAt hospitalVerified escalationRound nextEscalationAt contactedDonors extensions released releaseAt bloodGroup component location";

// Closes every open request whose time is up.
async function sweepExpired(now = new Date()) {
  const res = await Request.updateMany(
    { status: { $in: rules.OPEN_FOR_SEARCH }, expiresAt: { $lte: now } },
    { $set: { status: "Expired", closedReason: "Timed out", closedAt: now, nextEscalationAt: null } }
  );
  return res.modifiedCount || 0;
}

// Same, but at most every 30 seconds — used on page loads so a busy site
// doesn't run the sweep on every single request.
let lastSweep = 0;
async function sweepExpiredThrottled(minGapMs = 30000) {
  const t = Date.now();
  if (t - lastSweep < minGapMs) return 0;
  lastSweep = t;
  return sweepExpired();
}

// Requests created before v1.5 have no expiresAt. Give them one (based on
// when they were created) so the sweep can handle them like any other.
async function backfillLifecycleFields() {
  const legacy = await Request.find({ expiresAt: { $exists: false } }).select("urgency createdAt").lean();
  if (legacy.length === 0) return 0;
  const ops = legacy.map((r) => ({
    updateOne: {
      filter: { _id: r._id, expiresAt: { $exists: false } },
      update: { $set: { expiresAt: new Date(new Date(r.createdAt).getTime() + rules.expiryHoursFor(r.urgency) * 3600e3) } },
    },
  }));
  await Request.bulkWrite(ops);
  return ops.length;
}

// Widens the search for one request: notifies the next batch of donors.
// Uses a compare-and-swap on nextEscalationAt so that if the background timer
// and a page load both notice at once, only one of them actually notifies.
async function escalateRequest(doc, now = new Date()) {
  if (!rules.shouldEscalate(doc, now)) return { escalated: false };

  const roundAfter = (doc.escalationRound || 0) + 1;
  const claimed = await Request.findOneAndUpdate(
    { _id: doc._id, nextEscalationAt: doc.nextEscalationAt },
    { $set: { nextEscalationAt: rules.nextEscalationAfterRound(doc.urgency, roundAfter, now) }, $inc: { escalationRound: 1 } },
    { new: true }
  );
  if (!claimed) return { escalated: false }; // someone else got there first

  const { donors } = await findRankedDonors(claimed, Math.min(claimed.contactedDonors.length + rules.BATCH_SIZE, 100), { respectSchedule: true, now });
  const batch = rules.pickEscalationBatch(donors, claimed, rules.BATCH_SIZE);
  if (batch.length === 0) return { escalated: true, contacted: 0 };

  const entries = await contactDonors(claimed, batch, { escalated: true });
  await Request.updateOne({ _id: claimed._id }, { $push: { contactedDonors: { $each: entries }, timeline: { type: "escalated", at: now, detail: `${entries.length} more donor${entries.length === 1 ? "" : "s"} notified` } } });
  await Request.updateOne({ _id: claimed._id, status: "Searching" }, { $set: { status: "Contacted" } });
  return { escalated: true, contacted: entries.length };
}

// Planned requests (v1.9): once their release time arrives, contact the first
// batch of donors and start the normal escalation clock. Compare-and-swap on
// `released` so the background timer and a page view can't both release it.
async function releaseRequest(doc, now = new Date()) {
  if (rules.isReleased(doc) || !doc.releaseAt || new Date(doc.releaseAt) > now) return { released: false };
  if (!rules.isOpenForSearch(doc)) return { released: false };
  const claimed = await Request.findOneAndUpdate(
    { _id: doc._id, released: false },
    { $set: { released: true, nextEscalationAt: new Date(now.getTime() + rules.escalationMsFor(doc.urgency)) }, $push: { timeline: { type: "released", at: now, detail: "Donors are now being contacted" } } },
    { new: true }
  );
  if (!claimed) return { released: false };
  const contacted = await contactFirstBatch(claimed);
  return { released: true, contacted };
}

// Called when someone looks at one request: time it out or widen the search
// right now if that's due, rather than waiting for the background timer.
async function maintainRequest(id, now = new Date()) {
  const doc = await Request.findById(id).select(LIFECYCLE_FIELDS);
  if (!doc) return;
  if (rules.isDueToExpire(doc, now)) {
    await Request.updateOne(
      { _id: id, status: { $in: rules.OPEN_FOR_SEARCH } },
      { $set: { status: "Expired", closedReason: "Timed out", closedAt: now, nextEscalationAt: null } }
    );
    return;
  }
  if (!rules.isReleased(doc)) {
    await releaseRequest(doc, now);
    return;
  }
  await escalateRequest(doc, now);
}

async function runMaintenanceTick() {
  const now = new Date();
  await sweepExpired(now);
  const toRelease = await Request.find({ released: false, releaseAt: { $lte: now }, status: { $in: rules.OPEN_FOR_SEARCH } })
    .select(LIFECYCLE_FIELDS)
    .limit(25);
  for (const d of toRelease) {
    try {
      await releaseRequest(d, now);
    } catch (err) {
      console.error("Release failed:", err.message);
    }
  }
  try {
    await require("./recurring").generateDueRecurring(now);
    await require("./reminders").sendEligibleAgainReminders(now);
  } catch (err) {
    console.error("Recurring/reminder step failed:", err.message);
  }
  const due = await Request.find({
    status: { $in: rules.OPEN_FOR_SEARCH },
    nextEscalationAt: { $lte: now },
    escalationRound: { $lt: rules.MAX_ESCALATIONS },
  })
    .select(LIFECYCLE_FIELDS)
    .limit(25);
  for (const d of due) {
    try {
      await escalateRequest(d, now);
    } catch (err) {
      console.error("Escalation failed:", err.message);
    }
  }
}

// Background timer. Note: on free hosting that sleeps when idle this simply
// pauses — which is why maintainRequest() is also called whenever a request
// is viewed, so a waiting seeker's request is still handled promptly.
function startMaintenanceLoop(intervalMs = 60000) {
  const timer = setInterval(() => {
    runMaintenanceTick().catch((err) => console.error("Maintenance tick failed:", err.message));
  }, intervalMs);
  if (timer.unref) timer.unref();
  return timer;
}

module.exports = {
  sweepExpired, sweepExpiredThrottled, backfillLifecycleFields,
  escalateRequest, releaseRequest, maintainRequest, runMaintenanceTick, startMaintenanceLoop,
};
