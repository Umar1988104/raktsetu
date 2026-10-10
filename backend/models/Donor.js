const mongoose = require("mongoose");

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const donorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Set when this donor profile represents a family member of `user` rather
    // than the account holder themself — references that family member's
    // subdocument _id on User.familyMembers. Null/absent means "the account
    // holder is the donor". One account can now have several Donor profiles
    // (self + any number of family members), so `user` alone is no longer unique.
    familyMemberId: { type: mongoose.Schema.Types.ObjectId, default: null },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
    area: { type: String, required: true, trim: true }, // human-readable, e.g. "Saket, New Delhi"
    // GeoJSON point: [longitude, latitude] — used later for distance-based matching (v0.3)
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    // Used ONLY to apply the correct safe gap between donations (men: 3 months,
    // women: 4 months). Optional — blank falls back to the longer, safer gap.
    sex: { type: String, enum: ["male", "female"], default: null },
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
donorSchema.index({ user: 1, familyMemberId: 1 }, { unique: true });

donorSchema.statics.BLOOD_GROUPS = BLOOD_GROUPS;

module.exports = mongoose.model("Donor", donorSchema);
