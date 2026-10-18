const AuditLog = require("../models/AuditLog");

// Records an admin action. Best effort: a logging problem must never block
// the action itself, so errors are swallowed (and printed for the developer).
async function logAdminAction(req, { action, targetType, targetId, summary }) {
  try {
    await AuditLog.create({
      actorUid: req.user?.uid || "unknown",
      action,
      targetType,
      targetId: targetId ? String(targetId) : undefined,
      summary: summary ? String(summary).slice(0, 200) : undefined,
    });
  } catch (err) {
    console.error("Audit log write failed:", err.message);
  }
}

module.exports = { logAdminAction };
