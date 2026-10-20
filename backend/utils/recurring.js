const RecurringPlan = require("../models/RecurringPlan");
const User = require("../models/User");
const { createRequestForSeeker } = require("./requestFactory");
const { sendEmail } = require("./sendEmail");

const DAY = 24 * 3600e3;
const LEAD_DAYS = 7; // a plan's request is created this long before it is needed
const MAX_ACTIVE_PLANS = 5;

// Turns ONE occurrence of a plan into a request. The compare-and-swap on
// nextNeededAt means the background timer and a page view can't both do it.
async function generateOne(plan, now) {
  const occurrence = new Date(plan.nextNeededAt);
  const next = new Date(occurrence.getTime() + plan.everyWeeks * 7 * DAY);

  const claimed = await RecurringPlan.findOneAndUpdate(
    { _id: plan._id, active: true, nextNeededAt: plan.nextNeededAt },
    { $set: { nextNeededAt: next, lastGeneratedAt: now } },
    { new: false }
  );
  if (!claimed) return false; // someone else got there first
  if (occurrence.getTime() <= now.getTime()) return false; // missed while the server slept; plan moves on

  const user = await User.findById(plan.seeker);
  if (!user || user.role !== "seeker" || user.isGuest) return false;
  if (user.throttledUntil && user.throttledUntil > now) return false; // blocked after a fake-report

  const lng = plan.location.coordinates[0];
  const lat = plan.location.coordinates[1];
  const { request } = await createRequestForSeeker({
    user,
    fields: {
      bloodGroup: plan.bloodGroup,
      component: plan.component,
      units: plan.units,
      urgency: "Normal",
      hospital: plan.hospital,
      area: plan.area,
      lat,
      lng,
      notes: plan.notes,
      familyMemberId: plan.familyMemberId,
      neededBy: occurrence,
    },
    now,
    recurringPlan: plan._id,
  });

  // Best-effort reminder to the seeker; failures never matter here.
  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: "RaktSetu: your repeating blood request has been scheduled",
      text: `Your repeating request has been scheduled for ${occurrence.toDateString()} at ${plan.hospital}.\n\nDonors will be contacted a few days before. You can see it, change it or pause the plan in RaktSetu under My Requests.`,
    });
  }
  return request ? true : false;
}

// Creates requests for every plan that is due (or just one seeker's, when they
// look at their requests — free hosting sleeps, so the timer alone isn't enough).
async function generateDueRecurring(now = new Date(), { seekerId } = {}) {
  const filter = { active: true, nextNeededAt: { $lte: new Date(now.getTime() + LEAD_DAYS * DAY) } };
  if (seekerId) filter.seeker = seekerId;
  const plans = await RecurringPlan.find(filter).limit(25);
  let created = 0;
  for (const plan of plans) {
    try {
      if (await generateOne(plan, now)) created++;
    } catch (err) {
      console.error("Recurring plan failed:", err.message);
    }
  }
  return created;
}

module.exports = { generateDueRecurring, generateOne, LEAD_DAYS, MAX_ACTIVE_PLANS };
