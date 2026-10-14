// Admins are identified by Firebase user ID (set in ADMIN_UIDS in .env,
// comma-separated) — NOT by email. Firebase doesn't verify email ownership at
// sign-up, so an email check would let anyone claim admin by registering with
// the admin's address first. A UID can't be chosen by the person signing up.
const adminUids = () => (process.env.ADMIN_UIDS || "").split(",").map((s) => s.trim()).filter(Boolean);
const isAdminUid = (uid) => !!uid && adminUids().includes(uid);

// Use AFTER verifyToken.
function requireAdmin(req, res, next) {
  if (!isAdminUid(req.user && req.user.uid)) return res.status(403).json({ error: "Admin access only" });
  next();
}

module.exports = { requireAdmin, isAdminUid };
