const admin = require("../firebaseAdmin");

// Sends a push to every device token a donor has registered. If they have
// none (push was never set up, or permission was denied), this just does
// nothing and the caller falls back to email — it never throws.
async function sendPush(tokens, { title, body, data = {} }) {
  if (!tokens || tokens.length === 0) return { sent: 0 };

  try {
    const result = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data,
    });
    return { sent: result.successCount };
  } catch (err) {
    console.error("Push send failed:", err.message);
    return { sent: 0, error: err.message };
  }
}

module.exports = { sendPush };
