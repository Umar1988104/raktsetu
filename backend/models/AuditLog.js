const mongoose = require("mongoose");

// A record of what admins did (v1.8), for accountability. Deliberately holds
// NO personal data: only the kind of action, what it was done to (an id) and a
// short plain summary. Entries are deleted automatically after one year.
const auditLogSchema = new mongoose.Schema({
  actorUid: { type: String, required: true }, // the admin's Firebase uid
  action: { type: String, required: true }, // e.g. "request.close"
  targetType: { type: String, required: true }, // "request" | "user" | "hospital"
  targetId: { type: String },
  summary: { type: String, maxlength: 200 },
  at: { type: Date, default: Date.now, index: { expireAfterSeconds: 365 * 24 * 60 * 60 } },
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
