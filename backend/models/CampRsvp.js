const mongoose = require("mongoose");

// "I'll be there" for a donation camp (v2.1). Deliberately minimal: who + which
// camp + whether the day-before reminder went out. Hospitals only ever see a
// COUNT of these, never who is coming.
const campRsvpSchema = new mongoose.Schema(
  {
    camp: { type: mongoose.Schema.Types.ObjectId, ref: "Camp", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reminderSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

campRsvpSchema.index({ camp: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("CampRsvp", campRsvpSchema);
