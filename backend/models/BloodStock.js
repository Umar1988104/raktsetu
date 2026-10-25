const mongoose = require("mongoose");

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// Hand-updated blood stock board (v2.1). One board per approved hospital partner.
// Numbers are whatever the hospital typed in; the public page always shows how
// long ago that was and a "call to confirm" notice.
const bloodStockSchema = new mongoose.Schema(
  {
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    hospitalName: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true, maxlength: 200 },
    area: { type: String, required: true, trim: true, maxlength: 100 },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    levels: [
      {
        _id: false,
        group: { type: String, enum: BLOOD_GROUPS, required: true },
        units: { type: Number, min: 0, max: 999, required: true },
      },
    ],
    stockUpdatedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

bloodStockSchema.index({ location: "2dsphere" });
bloodStockSchema.statics.BLOOD_GROUPS = BLOOD_GROUPS;

module.exports = mongoose.model("BloodStock", bloodStockSchema);
