const mongoose = require("mongoose");
const Donor = require("./Donor");

// A repeating need, e.g. a thalassemia or dialysis patient who needs blood every
// few weeks (v1.9). The server turns each due occurrence into a normal planned
// request, so donors are contacted the usual way — no one has to remember.
const recurringPlanSchema = new mongoose.Schema(
  {
    seeker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    familyMemberId: { type: mongoose.Schema.Types.ObjectId, default: null },
    patientName: { type: String, trim: true },
    bloodGroup: { type: String, enum: Donor.BLOOD_GROUPS, required: true },
    component: { type: String, enum: ["Whole blood", "Platelets", "Plasma"], default: "Whole blood" },
    units: { type: Number, required: true, min: 1, max: 10 },
    hospital: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    notes: { type: String, trim: true, maxlength: 300 },
    everyWeeks: { type: Number, required: true, min: 1, max: 12 },
    nextNeededAt: { type: Date, required: true, index: true }, // the next occurrence not yet turned into a request
    active: { type: Boolean, default: true },
    lastGeneratedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RecurringPlan", recurringPlanSchema);
