const mongoose = require("mongoose");

const campSchema = new mongoose.Schema(
  {
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    hospitalName: { type: String, required: true, trim: true }, // denormalized for easy display
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    address: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    accessibility: {
      wheelchairRamp: { type: Boolean, default: false },
      groundFloor: { type: Boolean, default: false },
      accessibleParking: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

campSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Camp", campSchema);
