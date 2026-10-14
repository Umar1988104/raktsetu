// The rules for how long a request stays open and when the search widens.
// Pure functions only (no database) so they're easy to test and reason about.

const OPEN_FOR_SEARCH = ["Searching", "Contacted"]; // still looking for a donor
const OPEN_STATUSES = ["Searching", "Contacted", "Confirmed"];

// How long a request stays open before it times out, by urgency.
const EXPIRY_HOURS = { Normal: 72, Urgent: 48, Critical: 24 };
// If nobody has accepted after this long, notify the next batch of donors.
const ESCALATION_MINUTES = { Normal: 45, Urgent: 20, Critical: 15 };

const BATCH_SIZE = 10; // donors notified per round
const MAX_ESCALATIONS = 3; // extra rounds after the first (so up to 40 donors in total)
const MAX_EXTENSIONS = 2; // times a seeker can say "yes, still need blood"
const PROMPT_FRACTION = 0.25; // ask "still need blood?" in the last quarter of the time

const HOUR = 3600e3;
const MIN = 60e3;

const expiryHoursFor = (urgency) => EXPIRY_HOURS[urgency] || EXPIRY_HOURS.Normal;
const escalationMsFor = (urgency) => (ESCALATION_MINUTES[urgency] || ESCALATION_MINUTES.Normal) * MIN;
const computeExpiresAt = (urgency, from = new Date()) => new Date(from.getTime() + expiryHoursFor(urgency) * HOUR);

// Older requests (from before v1.5) have no expiresAt stored — work it out.
function effectiveExpiresAt(r) {
  if (r.expiresAt) return new Date(r.expiresAt);
  return new Date(new Date(r.createdAt).getTime() + expiryHoursFor(r.urgency) * HOUR);
}

const isOpenForSearch = (r) => OPEN_FOR_SEARCH.includes(r.status);
const isDueToExpire = (r, now = new Date()) => isOpenForSearch(r) && effectiveExpiresAt(r) <= now;
const hasAccepted = (r) => (r.contactedDonors || []).some((c) => c.status === "Accepted");

// What the seeker's screen needs to show the "Still need blood?" prompt.
function lifecycleInfo(r, now = new Date()) {
  const open = isOpenForSearch(r);
  const closesAt = open ? effectiveExpiresAt(r) : null;
  const msLeft = closesAt ? closesAt.getTime() - now.getTime() : null;
  const ttlMs = expiryHoursFor(r.urgency) * HOUR;
  return {
    closesAt,
    hoursLeft: msLeft === null ? null : Math.max(0, Math.round((msLeft / HOUR) * 10) / 10),
    showStillNeedPrompt: open && msLeft > 0 && msLeft <= ttlMs * PROMPT_FRACTION,
    canExtend: open && (r.extensions || 0) < MAX_EXTENSIONS,
  };
}

// Is it time to widen the search and notify more donors?
function shouldEscalate(r, now = new Date()) {
  if (!isOpenForSearch(r)) return false;
  if (isDueToExpire(r, now)) return false;
  if (r.urgency === "Critical" && !r.hospitalVerified) return false; // still waiting on the hospital
  if (hasAccepted(r)) return false; // someone already said yes
  if ((r.escalationRound || 0) >= MAX_ESCALATIONS) return false;
  if (!r.nextEscalationAt) return false;
  return new Date(r.nextEscalationAt) <= now;
}

// From a ranked list of donors, pick the next batch who haven't been contacted yet.
function pickEscalationBatch(rankedDonors, request, size = BATCH_SIZE) {
  const already = new Set(
    (request.contactedDonors || []).map((c) => String(c.donor && c.donor._id ? c.donor._id : c.donor))
  );
  return rankedDonors.filter((d) => !already.has(String(d._id))).slice(0, size);
}

// Timestamps to store when a request is created (or released after verification).
function initialSchedule(urgency, now = new Date()) {
  return {
    expiresAt: computeExpiresAt(urgency, now),
    nextEscalationAt: new Date(now.getTime() + escalationMsFor(urgency)),
  };
}

// When the next escalation is due after finishing round `roundAfter` (null = rounds used up).
function nextEscalationAfterRound(urgency, roundAfter, now = new Date()) {
  return roundAfter >= MAX_ESCALATIONS ? null : new Date(now.getTime() + escalationMsFor(urgency));
}

module.exports = {
  OPEN_FOR_SEARCH, OPEN_STATUSES, EXPIRY_HOURS, ESCALATION_MINUTES,
  BATCH_SIZE, MAX_ESCALATIONS, MAX_EXTENSIONS, PROMPT_FRACTION,
  expiryHoursFor, escalationMsFor, computeExpiresAt, effectiveExpiresAt,
  isOpenForSearch, isDueToExpire, hasAccepted,
  lifecycleInfo, shouldEscalate, pickEscalationBatch, initialSchedule, nextEscalationAfterRound,
};
