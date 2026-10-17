const mongoose = require("mongoose");

// One RaktSetu member card per person: the account holder, each family
// member, and (for hospital accounts) a partner card. Created on first view
// of "My Card". A separate collection keeps public lookups by card ID simple.
const cardSchema = new mongoose.Schema(
  {
    cardId: { type: String, required: true, unique: true, index: true }, // RS-XXXX-XXXX (bearer secret)
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    familyMemberId: { type: mongoose.Schema.Types.ObjectId, default: null }, // null = the account holder
    kind: { type: String, enum: ["member", "partner"], default: "member" },

    // The owner decides what the public verify page may show. Everything not
    // listed here is never shown publicly, whatever these say.
    hidden: { type: Boolean, default: false }, // true = the public page behaves as if the card doesn't exist
    show: {
      name: { type: Boolean, default: true }, // first name + initial only
      bloodGroup: { type: Boolean, default: true },
      tier: { type: Boolean, default: true },
      verified: { type: Boolean, default: true },
      memberSince: { type: Boolean, default: false },
      eligibleToday: { type: Boolean, default: false }, // yes/no only
    },

    // Opt-in. Printed on the BACK of the owner's own card image only —
    // never returned by any public or hospital endpoint.
    emergencyContact: {
      enabled: { type: Boolean, default: false },
      name: { type: String, trim: true, maxlength: 60 },
      phone: { type: String, trim: true },
    },

    regeneratedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

cardSchema.index({ owner: 1, familyMemberId: 1, kind: 1 }, { unique: true });

module.exports = mongoose.model("Card", cardSchema);
