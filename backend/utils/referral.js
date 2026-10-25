const crypto = require("crypto");
const User = require("../models/User");
const Donor = require("../models/Donor");
const { ALPHABET } = require("./cardId");

// Referral links (v2.1): /signup?ref=CODE. The code is random (never derived from
// a name, phone or id). Rules:
//  - only a registered donor's code works (not hospitals, not guests);
//  - the invitee can't use their own code or a code from the same phone number;
//  - the inviter's trust only grows when the invitee's FIRST donation is
//    recorded (not on sign-up), once per invitee, capped at +20 points;
//  - nobody is ever told who invited whom: counts only, never names.
const CODE_LEN = 8;
const CODE_RE = new RegExp(`^[${ALPHABET}]{${CODE_LEN}}$`);
const MAX_BONUS_REFERRALS = 2;

function generateReferralCode() {
  const bytes = crypto.randomBytes(CODE_LEN);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length]; // 256 % 32 === 0, so no bias
  return out;
}

function normalizeReferralCode(input) {
  const s = String(input ?? "").toUpperCase().replace(/[\s-]/g, "");
  return CODE_RE.test(s) ? s : null;
}

function referralTrustBonus(count) {
  const n = Math.floor(Number(count) || 0);
  return Math.min(Math.max(n, 0), MAX_BONUS_REFERRALS) * 10;
}

// Pure: may this inviter's code be applied to someone registering with `phone`?
function canAcceptReferral(inviter, phone) {
  if (!inviter) return false;
  if (inviter.role !== "donor" || inviter.isGuest) return false;
  if (phone && inviter.phone === phone) return false;
  return true;
}

// Returns the inviter's _id, or null. Unknown / unusable codes are ignored
// silently so the sign-up form never reveals which codes exist.
async function resolveReferrer(rawCode, phone) {
  const code = normalizeReferralCode(rawCode);
  if (!code) return null;
  const inviter = await User.findOne({ referralCode: code }).select("_id phone role isGuest");
  return canAcceptReferral(inviter, phone) ? inviter._id : null;
}

// Gives the account a code the first time it is asked for.
async function ensureReferralCode(user) {
  if (user.referralCode) return user.referralCode;
  for (let attempt = 0; attempt < 5; attempt++) {
    user.referralCode = generateReferralCode();
    try {
      await user.save();
      return user.referralCode;
    } catch (err) {
      if (err && err.code === 11000) continue; // rare collision: try another
      throw err;
    }
  }
  user.referralCode = undefined;
  throw new Error("Could not create a referral code");
}

// Called after a request is marked Fulfilled, with the donors who accepted.
// Credits each invitee's inviter once. Never throws: a referral problem must not
// break closing a request.
async function creditReferralsForDonors(donorIds) {
  let credited = 0;
  try {
    const donors = await Donor.find({ _id: { $in: donorIds }, familyMemberId: null }).select("user");
    for (const d of donors || []) {
      const invitee = await User.findOneAndUpdate(
        { _id: d.user, referralCredited: { $ne: true }, referredBy: { $ne: null } },
        { $set: { referralCredited: true } },
        { new: false }
      ).select("+referredBy");
      if (invitee && invitee.referredBy) {
        await User.updateOne({ _id: invitee.referredBy }, { $inc: { referralCount: 1 } });
        credited++;
      }
    }
  } catch (err) {
    console.error("Referral credit failed (ignored):", err.message);
  }
  return credited;
}

module.exports = {
  generateReferralCode, normalizeReferralCode, referralTrustBonus, canAcceptReferral,
  resolveReferrer, ensureReferralCode, creditReferralsForDonors, MAX_BONUS_REFERRALS,
};
