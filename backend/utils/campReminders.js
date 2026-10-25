const Camp = require("../models/Camp");
const CampRsvp = require("../models/CampRsvp");
const mailer = require("./sendEmail");

// Camp reminders (v2.1): one email per RSVP, sent once, when the camp is within
// the next 24 hours. The row is claimed BEFORE sending so a crash or a second
// server tick can never send twice. No phone numbers, no other donors' names.
let lastRun = 0;
async function sendCampReminders(now = new Date(), { minGapMs = 3600e3, windowMs = 24 * 3600e3, max = 50 } = {}) {
  if (now.getTime() - lastRun < minGapMs) return 0;
  lastRun = now.getTime();

  const camps = await Camp.find({ date: { $gt: now, $lte: new Date(now.getTime() + windowMs) } }).select("name hospitalName date address area");
  if (!camps || !camps.length) return 0;
  const byId = new Map(camps.map((c) => [String(c._id), c]));

  const rsvps = await CampRsvp.find({ camp: { $in: camps.map((c) => c._id) }, reminderSentAt: null })
    .populate("user", "email isGuest")
    .limit(200);

  let sent = 0;
  for (const r of rsvps || []) {
    if (sent >= max) break; // stay well inside free email limits
    const claimed = await CampRsvp.findOneAndUpdate({ _id: r._id, reminderSentAt: null }, { $set: { reminderSentAt: now } });
    if (!claimed) continue;
    const camp = byId.get(String(r.camp));
    if (!camp || !r.user?.email || r.user.isGuest) continue;
    const when = new Date(camp.date).toLocaleDateString("en-IN", { dateStyle: "full", timeZone: "Asia/Kolkata" });
    await mailer.sendEmail({
      to: r.user.email,
      subject: `RaktSetu reminder: ${camp.name} is coming up`,
      text: `You said you'd come to a blood donation camp:\n\n${camp.name}\nHosted by ${camp.hospitalName}\n${when}\n${camp.address}, ${camp.area}\n\nThe camp team makes the final decision about who can donate on the day. If your plans changed, you can cancel your RSVP on the Donation camps page in RaktSetu.\n\nThank you for stepping up.`,
    });
    sent++;
  }
  return sent;
}

module.exports = { sendCampReminders };
