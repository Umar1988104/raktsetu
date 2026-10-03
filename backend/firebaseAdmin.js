const admin = require("firebase-admin");

// The service account JSON is stored as a single-line string in the
// FIREBASE_SERVICE_ACCOUNT_JSON env var (see .env.example / README).
let serviceAccount = null;
try {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) serviceAccount = JSON.parse(raw);
} catch (err) {
  console.error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON:", err.message);
}

if (!admin.apps.length) {
  if (serviceAccount && serviceAccount.project_id) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    // Don't crash the whole server just because Firebase isn't configured yet —
    // this lets you boot the backend and hit unauthenticated routes while you
    // finish setting up your Firebase project. Any route behind verifyToken
    // will return a clear error until FIREBASE_SERVICE_ACCOUNT_JSON is set.
    console.warn(
      "FIREBASE_SERVICE_ACCOUNT_JSON is missing or incomplete — auth-protected routes will fail until it's set in .env"
    );
  }
}

module.exports = admin;
