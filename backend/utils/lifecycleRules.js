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

// --- Plan-ahead requests (v1.9) ---
// A request for a planned need (e.g. surgery next week). Donors are not
// contacted until RELEASE_LEAD_HOURS before it is needed, so they aren't asked
// weeks early. Needs under MIN_PLAN_LEAD_HOURS away are just normal requests.
const MIN_PLAN_LEAD_HOURS = 24;
const MAX_PLAN_LEAD_DAYS = 30;
const RELEASE_LEAD_HOURS = 72;
const PLANNED_GRACE_HOURS = 12; // stays open this long after the needed time

const expiryHoursFor = (urgency) => EXPIRY_HOURS[urgency] || EXPIRY_HOURS.Normal;
const escalationMsFor = (urgency) => (ESCALATION_MINUTES[urgency] || ESCALATION_MINUTES.Normal) * MIN;
const computeExpiresAt = (urgency, from = new Date()) => new Date(from.getTime() + expiryHoursFor(urgency) * HOUR);

// Older requests (from before v1.5) have no expiresAt stored — work it out.
function effectiveExpiresAt(r) {
  if (r.expiresAt) return new Date(r.expiresAt);
  return new Date(new Date(r.createdAt).getTime() + expiryHoursFor(r.urgency) * HOUR);
}

const isOpenForSearch = (r) => OPEN_FOR_SEARCH.includes(r.status);
// Older requests (and normal ones) have no "released" flag: they are released.
const isReleased = (r) => r.released !== false;
const isDueToExpire = (r, now = new Date()) => isOpenForSearch(r) && effectiveExpiresAt(r) <= now;
const hasAccepted = (r) => (r.contactedDonors || []).some((c) => c.status === "Accepted");

// What the seeker's screen needs to show the "Still need blood?" prompt.
function lifecycleInfo(r, now = new Date()) {
  const open = isOpenForSearch(r);
  const closesAt = open ? effectiveExpiresAt(r) : null;
  const msLeft = closesAt ? closesAt.getTime() - now.getTime() : null;
  const ttlMs = expiryHoursFor(r.urgency) * HOUR;
  const scheduled = open && !isReleased(r);
  return {
    closesAt,
    hoursLeft: msLeft === null ? null : Math.max(0, Math.round((msLeft / HOUR) * 10) / 10),
    // Not asked "Still need blood?" before donors have even been contacted.
    showStillNeedPrompt: open && !scheduled && msLeft > 0 && msLeft <= ttlMs * PROMPT_FRACTION,
    canExtend: open && !scheduled && (r.extensions || 0) < MAX_EXTENSIONS,
    scheduled,
    releaseAt: scheduled && r.releaseAt ? new Date(r.releaseAt) : null,
  };
}

// Is it time to widen the search and notify more donors?
function shouldEscalate(r, now = new Date()) {
  if (!isOpenForSearch(r)) return false;
  if (!isReleased(r)) return false; // planned request, donors not contacted yet
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

// Checks a "needed by" value from the form. Returns { neededBy } (a Date), { none: true } or { error }.
function parseNeededBy(value, now = new Date()) {
  if (value === undefined || value === null || value === "") return { none: true };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { error: "That date and time isn't valid" };
  if (d.getTime() <= now.getTime()) return { error: "The needed-by time must be in the future" };
  if (d.getTime() - now.getTime() > MAX_PLAN_LEAD_DAYS * 24 * HOUR) return { error: `You can plan at most ${MAX_PLAN_LEAD_DAYS} days ahead` };
  return { neededBy: d };
}

// Timestamps for a request. If it's needed far enough ahead it is "planned":
// held until releaseAt, then handled like any request. Otherwise it behaves
// exactly like a normal request.
function requestSchedule({ urgency, neededBy = null, now = new Date() }) {
  if (!neededBy || neededBy.getTime() - now.getTime() < MIN_PLAN_LEAD_HOURS * HOUR) {
    return { planned: false, released: true, releaseAt: null, ...initialSchedule(urgency, now) };
  }
  const releaseAt = new Date(neededBy.getTime() - RELEASE_LEAD_HOURS * HOUR);
  const releaseNow = releaseAt.getTime() <= now.getTime();
  return {
    planned: true,
    released: releaseNow,
    releaseAt: releaseNow ? now : releaseAt,
    expiresAt: new Date(neededBy.getTime() + PLANNED_GRACE_HOURS * HOUR),
    nextEscalationAt: releaseNow ? new Date(now.getTime() + escalationMsFor(urgency)) : null,
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
  MIN_PLAN_LEAD_HOURS, MAX_PLAN_LEAD_DAYS, RELEASE_LEAD_HOURS, PLANNED_GRACE_HOURS,
  isOpenForSearch, isReleased, isDueToExpire, hasAccepted, parseNeededBy, requestSchedule,
  lifecycleInfo, shouldEscalate, pickEscalationBatch, initialSchedule, nextEscalationAfterRound,
};
