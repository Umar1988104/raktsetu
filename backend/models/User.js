const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    role: { type: String, enum: ["donor", "seeker"], required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
