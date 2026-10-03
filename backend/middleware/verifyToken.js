const admin = require("../firebaseAdmin");

// Every protected request from the frontend sends:
//   Authorization: Bearer <firebase-id-token>
// This middleware verifies that token with Firebase and attaches the
// decoded user (uid, email) to req.user for downstream routes to use.
async function verifyToken(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing Authorization Bearer token" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email || null };
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = verifyToken;
