const { getNextEligibleDate } = require("./eligibility");
const { computeTrustTier } = require("./trust");

// Gathers everything about whose card this is, from the owner's account and
// donor profiles. Internal only — never sent as-is. The serializers in
// serializers.js decide which parts may leave the server.
function buildCardView(card, user, donors = []) {
  const plain = (d) => (d && d.toObject ? d.toObject() : d);
  const c = plain(card);
  const u = plain(user) || {};

  if (c.kind === "partner") {
    return {
      card: c,
      user: u,
      kind: "partner",
      isSelf: true,
      name: u.hospitalName || u.name,
      hospitalName: u.hospitalName || u.name,
      partnerVerified: !!u.partnerVerified,
      memberSince: u.createdAt || c.createdAt,
    };
  }

  const familyId = c.familyMemberId ? String(c.familyMemberId) : null;
  const fm = familyId ? (u.familyMembers || []).find((m) => String(m._id) === familyId) : null;
  const donor = (donors || []).map(plain).find((d) => (d.familyMemberId ? String(d.familyMemberId) : null) === familyId) || null;

  const next = donor ? getNextEligibleDate(donor) : null;
  return {
    card: c,
    user: u,
    kind: "member",
    isSelf: !familyId,
    name: familyId ? fm?.name || "Family member" : u.name,
    relation: fm?.relation || null,
    bloodGroup: donor?.bloodGroup || fm?.bloodGroup || null,
    hasDonorProfile: !!donor,
    tier: computeTrustTier(donor || { verified: false, donationHistory: [] }, u),
    verified: !!donor?.verified,
    memberSince: familyId ? c.createdAt : u.createdAt || c.createdAt,
    stamps: (donor?.donationHistory || []).map((h) => h.date).filter(Boolean),
    nextEligibleDate: next,
    eligibleToday: donor ? next === null : null,
    photo: familyId ? null : u.photo || null,
    donorId: donor?._id || null,
    referralsDonated: familyId ? 0 : Number(u.referralCount) || 0, // only the account holder's own card
  };
}

module.exports = { buildCardView };
