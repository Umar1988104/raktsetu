const Request = require("../models/Request");
const rules = require("./lifecycleRules");
const { COMPONENTS } = require("./bloodCompatibility");
const { findRankedDonors } = require("./matching");
const { contactDonors } = require("./notify");

// Checks the v1.9 extras on a new request: what is needed and when.
// Returns { component, neededBy } or { error }.
function parseRequestExtras(body, now = new Date()) {
  const component = body.component === undefined || body.component === "" ? "Whole blood" : body.component;
  if (!COMPONENTS.includes(component)) return { error: `component must be one of: ${COMPONENTS.join(", ")}` };

  const needed = rules.parseNeededBy(body.neededBy, now);
  if (needed.error) return { error: needed.error };
  const neededBy = needed.neededBy || null;

  const level = body.urgency || "Normal";
  if (level === "Critical" && neededBy && neededBy.getTime() - now.getTime() >= rules.MIN_PLAN_LEAD_HOURS * 3600e3) {
    return { error: "Critical requests are for right now and can't be scheduled ahead. Choose Normal or Urgent to plan ahead." };
  }
  return { component, neededBy };
}

// Notifies the first batch of matching donors (respecting their own schedules).
async function contactFirstBatch(request) {
  const { donors } = await findRankedDonors(request, rules.BATCH_SIZE, { respectSchedule: true });
  if (donors.length > 0) {
    request.contactedDonors = await contactDonors(request, donors);
    request.status = "Contacted";
    await request.save();
  }
  return donors.length;
}

// Creates a request for a seeker and, unless it is Critical (waits for the
// hospital) or planned for later (waits for its release time), contacts donors.
// Shared by POST /requests and by recurring plans, so both follow the same rules.
async function createRequestForSeeker({ user, fields, ip = null, now = new Date(), recurringPlan = null }) {
  const { bloodGroup, units, urgency, hospital, area, lat, lng, notes, familyMemberId, component = "Whole blood", neededBy = null } = fields;

  let patientName = user.name;
  if (familyMemberId) {
    const fm = user.familyMembers.id(familyMemberId);
    if (!fm) {
      const err = new Error("That family member doesn't exist on this account");
      err.status = 400;
      throw err;
    }
    patientName = fm.name;
  }

  const level = urgency || "Normal";
  const isCritical = level === "Critical";
  const schedule = rules.requestSchedule({ urgency: level, neededBy, now });

  const request = await Request.create({
    seeker: user._id,
    familyMemberId: familyMemberId || null,
    patientName,
    bloodGroup,
    component,
    units,
    urgency: level,
    hospital,
    area,
    location: { type: "Point", coordinates: [Number(lng), Number(lat)] },
    notes,
    creatorIp: ip,
    neededBy,
    releaseAt: schedule.releaseAt,
    released: schedule.released,
    recurringPlan,
    expiresAt: schedule.expiresAt,
    // Critical requests wait for hospital verification before any searching.
    nextEscalationAt: isCritical ? null : schedule.nextEscalationAt,
  });

  if (isCritical) return { request, awaitingHospitalVerification: true };
  if (schedule.released) await contactFirstBatch(request);
  return { request };
}

module.exports = { parseRequestExtras, contactFirstBatch, createRequestForSeeker };
