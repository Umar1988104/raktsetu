const mongoose = require("mongoose");
const Donor = require("./Donor");
const BLOOD_GROUPS = Donor.BLOOD_GROUPS;

const requestSchema = new mongoose.Schema(
  {
    seeker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
    units: { type: Number, required: true, min: 1 },
    urgency: { type: String, enum: ["Normal", "Urgent", "Critical"], default: "Normal" },
    hospital: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    status: {
      type: String,
      enum: ["Searching", "Contacted", "Confirmed", "Fulfilled", "Expired"],
      default: "Searching",
    },
    hospitalVerified: { type: Boolean, default: false }, // required for Critical urgency (v0.6)
    notes: { type: String, trim: true },
    // Donors this request was auto-matched and notified to, with their individual response.
    contactedDonors: [
      {
        donor: { type: mongoose.Schema.Types.ObjectId, ref: "Donor" },
        status: { type: String, enum: ["Pending", "Accepted", "Declined"], default: "Pending" },
        notifiedAt: { type: Date, default: Date.now },
        respondedAt: { type: Date },
      },
    ],
  },
  { timestamps: true }
);

requestSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Request", requestSchema);
