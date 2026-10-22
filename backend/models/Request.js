const mongoose = require("mongoose");
const Donor = require("./Donor");
const BLOOD_GROUPS = Donor.BLOOD_GROUPS;

const requestSchema = new mongoose.Schema(
  {
    seeker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Set when the request is on behalf of a family member rather than the
    // account holder — references that family member's subdocument _id on
    // User.familyMembers. patientName is a denormalized snapshot (so it still
    // reads correctly even if the family member is later edited or removed).
    familyMemberId: { type: mongoose.Schema.Types.ObjectId, default: null },
    patientName: { type: String, trim: true },
    bloodGroup: { type: String, enum: BLOOD_GROUPS, required: true },
    // v1.9: what is needed. Matching rules differ per component (utils/bloodCompatibility.js).
    component: { type: String, enum: ["Whole blood", "Platelets", "Plasma"], default: "Whole blood" },
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
    // v2.0: real milestones for the owner's journey view (escalations etc.). Created/notified/accepted/closed are derived from other fields.
    timeline: {
      type: [{ type: { type: String, enum: ["escalated", "hospital-verified", "extended", "released"] }, at: { type: Date, default: Date.now }, detail: String, _id: false }],
      default: [],
    },
    notes: { type: String, trim: true },
    creatorIp: { type: String }, // used for guest-account rate limiting (v1.2)
    reportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "Donor" }], // donors who flagged this as fake
    reportedFake: { type: Boolean, default: false },
    // --- Lifecycle (v1.5) ---
    // When an open request times out. Seeker can extend it (max 2 times).
    expiresAt: { type: Date, index: true },
    extensions: { type: Number, default: 0 },
    closedReason: {
      type: String,
      enum: ["Timed out", "Closed by requester", "Reported as fake", "Closed by admin"],
    },
    closedAt: { type: Date }, // when it became Fulfilled or Expired
    // Auto-escalation: if nobody accepts in time, the next batch of donors is
    // notified. nextEscalationAt is null once the rounds are used up.
    escalationRound: { type: Number, default: 0 },
    nextEscalationAt: { type: Date, default: null, index: true },
    // --- Plan-ahead (v1.9) ---
    neededBy: { type: Date, default: null }, // when the blood is needed (null = now)
    releaseAt: { type: Date, default: null, index: true }, // when donors get contacted (planned requests)
    released: { type: Boolean, default: true }, // false = planned request still waiting for releaseAt
    recurringPlan: { type: mongoose.Schema.Types.ObjectId, ref: "RecurringPlan", default: null }, // set when auto-created from a plan
    isDemo: { type: Boolean, default: false, index: true }, // sample data from seed-demo.js
    // Random token for the public, read-only tracking link a seeker can share
    // (e.g. to a family WhatsApp group). Generated lazily when they first share.
    shareToken: { type: String, index: true, sparse: true },
    // One private thank-you note from the seeker to everyone who accepted,
    // sent after the request is fulfilled. No contact details change hands.
    thankYouNote: {
      message: { type: String, trim: true, maxlength: 300 },
      sentAt: { type: Date },
    },
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
