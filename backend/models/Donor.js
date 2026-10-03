const mongoose = require("mongoose");

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const donorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
    area: { type: String, required: true, trim: true }, // human-readable, e.g. "Saket, New Delhi"
    // GeoJSON point: [longitude, latitude] — used later for distance-based matching (v0.3)
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    available: { type: Boolean, default: true },
    verified: { type: Boolean, default: false },
    fcmTokens: [{ type: String }], // registered browser push tokens, if push is set up
    donationHistory: [
      {
        date: { type: Date, default: Date.now },
        requestId: { type: mongoose.Schema.Types.ObjectId, ref: "Request" },
      },
    ],
  },
  { timestamps: true }
);

donorSchema.index({ location: "2dsphere" });

donorSchema.statics.BLOOD_GROUPS = BLOOD_GROUPS;

module.exports = mongoose.model("Donor", donorSchema);
