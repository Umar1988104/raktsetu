const mongoose = require("mongoose");

const PHONE_REGEX = /^[6-9]\d{9}$/; // 10-digit Indian mobile number

const familyMemberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  relation: { type: String, trim: true }, // e.g. "Father", "Sister" — free text, not enforced
  bloodGroup: { type: String, enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
  phone: { type: String, trim: true, match: [PHONE_REGEX, "Phone must be a 10-digit Indian mobile number"] },
  // Sahyog Mode (v1.3) — for patients needing regular transfusions (e.g.
  // Thalassemia). intervalDays is typically 21-28 for whole-blood transfusion
  // cycles. Purely a reminder shown when they open the app — no background
  // push, since that would need real scheduled-job infrastructure.
  recurringCare: {
    conditionName: { type: String, trim: true },
    intervalDays: { type: Number, min: 7, max: 120 },
    lastTransfusionDate: { type: Date },
  },
});

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    // Optional — guest accounts (anonymous auth) have no email at all.
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true, match: [PHONE_REGEX, "Phone must be a 10-digit Indian mobile number"] },
    isGuest: { type: Boolean, default: false },
    // Set when a request of theirs was reported fake by donors — blocks new
    // requests until this time passes (v1.2 anti-spam).
    throttledUntil: { type: Date, default: null },
    alternatePhone: { type: String, trim: true, match: [PHONE_REGEX, "Phone must be a 10-digit Indian mobile number"] },
    address: { type: String, trim: true },
    // Small compressed photo as a data: URL — kept short on purpose (see
    // MAX_PHOTO_BYTES in auth.js) so this never becomes a real storage cost.
    photo: { type: String },
    role: { type: String, enum: ["donor", "seeker", "hospital"], required: true },
    // Only set for role: "hospital" — the partner hospital/blood-bank's display name,
    // matched (case-insensitively) against a request's `hospital` field to verify it.
    hospitalName: { type: String, trim: true },
    // One login can manage multiple people (v1.1) — a family member can be the
    // patient on a request, or have their own Donor profile under this account.
    familyMembers: [familyMemberSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
module.exports.PHONE_REGEX = PHONE_REGEX;
