const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    role: { type: String, enum: ["donor", "seeker", "hospital"], required: true },
    // Only set for role: "hospital" — the partner hospital/blood-bank's display name,
    // matched (case-insensitively) against a request's `hospital` field to verify it.
    hospitalName: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
