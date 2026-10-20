const Donor = require("../models/Donor");
const { getNextEligibleDate } = require("./eligibility");
const { sendEmail } = require("./sendEmail");

const lastDonation = (donor) => {
  const dates = (donor.donationHistory || []).map((h) => new Date(h.date).getTime()).filter(Number.isFinite);
  return dates.length ? new Date(Math.max(...dates)) : null;
};

// A donor is reminded ONCE per donation: when their gap has passed, they have
// donated before, and they aren't currently available (so they'd otherwise
// not realise they can start again).
function needsEligibleReminder(donor) {
  const last = lastDonation(donor);
  if (!last) return false;
  if (donor.available !== false) return false;
  if (getNextEligibleDate(donor)) return false; // still inside the gap
  return !donor.eligibleReminderSentAt || new Date(donor.eligibleReminderSentAt) < last;
}

let lastRun = 0;
async function sendEligibleAgainReminders(now = new Date(), { minGapMs = 3600e3 } = {}) {
  if (now.getTime() - lastRun < minGapMs) return 0;
  lastRun = now.getTime();

  const donors = await Donor.find({ available: false, "donationHistory.0": { $exists: true } })
    .populate("user", "email isGuest")
    .limit(200);
  let sent = 0;
  for (const d of donors) {
    if (sent >= 50) break; // stay well inside free email limits
    if (!needsEligibleReminder(d)) continue;
    d.eligibleReminderSentAt = now; // mark first: never send twice
    await d.save();
    if (d.user?.email && !d.user.isGuest) {
      await sendEmail({
        to: d.user.email,
        subject: "RaktSetu: you can donate again",
        text: "Good news — enough time has passed since your last donation, so you're eligible to donate again.\n\nIf you'd like to help, open RaktSetu and switch \"Available to donate\" on. There's no pressure; the blood bank always makes the final eligibility decision.",
      });
      sent++;
    }
  }
  return sent;
}

module.exports = { needsEligibleReminder, sendEligibleAgainReminders, lastDonation };
