const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("GMAIL_USER/GMAIL_APP_PASSWORD not set — email notifications will be skipped.");
    return null;
  }
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  return transporter;
}

// Fire-and-forget: a failed email should never crash the request that triggered it.
async function sendEmail({ to, subject, text }) {
  const t = getTransporter();
  if (!t || !to) return { sent: false };

  try {
    await t.sendMail({ from: process.env.GMAIL_USER, to, subject, text });
    return { sent: true };
  } catch (err) {
    console.error("Email send failed:", err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendEmail };
