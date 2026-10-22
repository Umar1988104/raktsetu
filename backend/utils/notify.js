const { sendPush } = require("./sendPush");
const { sendEmail } = require("./sendEmail");
const { resolveDonorContact } = require("./familyHelpers");

// Notifies a batch of matched donors (push if they have a token, email
// otherwise). Never throws — a notification failure must not block the
// request from being created or escalated. `escalated` rewords the message
// for donors reached in a later round.
async function contactDonors(request, donors, { escalated = false } = {}) {
  const notified = [];
  for (const d of donors) {
    const display = resolveDonorContact(d, d.user);
    const lead = escalated ? "Still needed: " : "";

    const pushResult = await sendPush(d.fcmTokens, {
      title: `${lead}${request.bloodGroup} blood needed nearby`,
      body: `${request.units} unit(s) · ${request.urgency} · ${request.hospital}`,
      data: { requestId: String(request._id) },
    });

    if (pushResult.sent === 0 && d.user?.email) {
      const forWhom = display.isFamilyMember ? ` (for ${display.name})` : "";
      await sendEmail({
        to: d.user.email,
        subject: `RaktSetu: ${escalated ? "a request is still waiting for a donor" : `a ${request.bloodGroup} request needs your help`}`,
        text: `A compatible blood request ${escalated ? "nearby is still waiting for a donor" : "was just raised near you"}${forWhom}:\n\n${request.units} unit(s) of ${request.bloodGroup}\nUrgency: ${request.urgency}\nHospital: ${request.hospital}\nArea: ${request.area}\n\nLog into RaktSetu and check your Notifications tab to accept or decline.`,
      });
    }

    notified.push({ donor: d._id, status: "Pending", notifiedAt: new Date() });
  }
  return notified;
}

module.exports = { contactDonors };
