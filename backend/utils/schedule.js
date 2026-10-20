// Donor availability preferences (v1.9): "emergencies only" and quiet hours.
// Pure functions, no database. All users are in India, so times are IST
// (UTC+5:30) — documented limitation, no per-user time zones.

const IST_OFFSET_MIN = 330;
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

const toMinutes = (hhmm) => {
  const m = HHMM.exec(hhmm || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

// Minutes since midnight in IST for a given moment.
function istMinutes(now = new Date()) {
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  return (utcMin + IST_OFFSET_MIN) % (24 * 60);
}

// Is `now` inside the donor's quiet window? Windows may cross midnight (22:00-07:00).
function inQuietHours(schedule, now = new Date()) {
  const q = schedule && schedule.quietHours;
  if (!q || !q.enabled) return false;
  const start = toMinutes(q.start);
  const end = toMinutes(q.end);
  if (start === null || end === null || start === end) return false;
  const t = istMinutes(now);
  return start < end ? t >= start && t < end : t >= start || t < end;
}

// Should this donor be CONTACTED for this request right now?
//  - emergencies only: never for Normal requests (Urgent and Critical are fine)
//  - quiet hours: during the window only Critical requests get through
// A donor who is skipped is not lost: later escalation rounds can still reach
// them, and they can always see and answer requests in the app.
function isDonorReachable(donor, request, now = new Date()) {
  const s = (donor && donor.schedule) || {};
  const urgency = request.urgency || "Normal";
  if (s.emergenciesOnly && urgency === "Normal") return false;
  if (inQuietHours(s, now) && urgency !== "Critical") return false;
  return true;
}

// Validates and normalises what a donor sends. Returns { value } or { error }.
function parseSchedule(body = {}) {
  const out = {};
  if (body.emergenciesOnly !== undefined) {
    if (typeof body.emergenciesOnly !== "boolean") return { error: "emergenciesOnly must be true or false" };
    out.emergenciesOnly = body.emergenciesOnly;
  }
  if (body.quietHours !== undefined) {
    const q = body.quietHours || {};
    if (typeof q.enabled !== "boolean") return { error: "quietHours.enabled must be true or false" };
    if (q.enabled) {
      if (toMinutes(q.start) === null || toMinutes(q.end) === null) return { error: "Quiet hours need start and end times like 22:00 and 07:00" };
      if (q.start === q.end) return { error: "Quiet hours start and end can't be the same time" };
    }
    out.quietHours = { enabled: q.enabled, start: q.start || "22:00", end: q.end || "07:00" };
  }
  return { value: out };
}

module.exports = { istMinutes, inQuietHours, isDonorReachable, parseSchedule, toMinutes };
