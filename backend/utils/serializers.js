// Whitelisting response builders. Every API response that contains someone
// else's data goes through one of these, so only fields we've deliberately
// chosen can ever leave the server. (Sending raw database documents is how
// phone numbers, push tokens and IP addresses end up in responses by accident.)

const { resolveDonorContact, maskPhone } = require("./familyHelpers");
const { getNextEligibleDate } = require("./eligibility");
const { computeTrustTier } = require("./trust");
const { lifecycleInfo } = require("./lifecycleRules");

const plain = (doc) => (doc && doc.toObject ? doc.toObject() : doc);

// "Rohan Sharma" -> "Rohan S."  — enough to recognise, not enough to look up.
function shortName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A donor";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
}

// Rounds a [lng, lat] pair to 2 decimals (~1 km) so map pins show the
// neighbourhood, not someone's front door.
const coarsen = (coords) => (Array.isArray(coords) ? coords.map((n) => Math.round(n * 100) / 100) : coords);

// mode: "public" (open browsing), "hospital" (a partner verifying a donor),
//       "self" (the donor looking at their own profile).
function serializeDonor(donorDoc, mode) {
  const d = plain(donorDoc);
  const full = resolveDonorContact(d, d.user);

  const base = {
    _id: d._id,
    bloodGroup: d.bloodGroup,
    area: d.area,
    available: d.available,
    verified: d.verified,
    trustTier: computeTrustTier(d, d.user),
    isDemo: !!d.isDemo,
  };

  if (mode === "public") {
    return { ...base, display: { name: shortName(full.name), phone: maskPhone(full.phone), relation: null } };
  }
  if (mode === "hospital") {
    return { ...base, display: { name: full.name, phone: full.phone, relation: full.relation } };
  }
  // self
  return {
    ...base,
    familyMemberId: d.familyMemberId || null,
    sex: d.sex || null,
    location: d.location ? { coordinates: d.location.coordinates } : undefined,
    donationHistory: (d.donationHistory || []).map((h) => ({ _id: h._id, date: h.date })),
    nextEligibleDate: getNextEligibleDate(d),
    display: { name: full.name, phone: full.phone, relation: full.relation, isFamilyMember: full.isFamilyMember },
  };
}

// What a donor is allowed to see about the person who asked for blood.
// Phone only appears once the donor has accepted.
function serializeSeekerForDonor(seeker, accepted) {
  if (!seeker) return null;
  return { name: accepted ? seeker.name : shortName(seeker.name), phone: accepted ? seeker.phone : null };
}

// One donor who was notified about a request, as the *seeker* may see them:
// anonymous-ish until they accept, then name + phone so the family can call.
function serializeContactedDonor(c) {
  const accepted = c.status === "Accepted";
  let donorDisplay = { name: "A donor", relation: null, phone: null };
  const d = c.donor;
  if (d && d.user) {
    const full = resolveDonorContact(d, d.user);
    donorDisplay = {
      name: accepted ? full.name : shortName(full.name),
      relation: accepted ? full.relation : null,
      phone: accepted ? full.phone : null,
    };
  }
  return {
    _id: c._id,
    status: c.status,
    notifiedAt: c.notifiedAt,
    respondedAt: c.respondedAt || null,
    donorDisplay,
  };
}

// A request, as its own seeker sees it. Deliberately leaves out creatorIp,
// reportedBy, shareToken and the seeker's internal id.
function serializeRequestForOwner(requestDoc, now = new Date()) {
  const r = plain(requestDoc);
  return {
    _id: r._id,
    status: r.status,
    bloodGroup: r.bloodGroup,
    units: r.units,
    urgency: r.urgency,
    hospital: r.hospital,
    area: r.area,
    notes: r.notes,
    patientName: r.patientName,
    familyMemberId: r.familyMemberId || null,
    hospitalVerified: r.hospitalVerified,
    thankYouNote: r.thankYouNote && r.thankYouNote.sentAt ? { message: r.thankYouNote.message, sentAt: r.thankYouNote.sentAt } : null,
    escalationRound: r.escalationRound || 0,
    closedReason: r.closedReason || null,
    closedAt: r.closedAt || null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    isDemo: !!r.isDemo,
    contactedDonors: (r.contactedDonors || []).map(serializeContactedDonor),
    lifecycle: lifecycleInfo(r, now),
  };
}

// A request, as a hospital partner sees it when verifying.
function serializeRequestForHospital(requestDoc) {
  const r = plain(requestDoc);
  return {
    _id: r._id,
    status: r.status,
    bloodGroup: r.bloodGroup,
    units: r.units,
    urgency: r.urgency,
    hospital: r.hospital,
    area: r.area,
    notes: r.notes,
    hospitalVerified: r.hospitalVerified,
    createdAt: r.createdAt,
    seeker: r.seeker && r.seeker.name ? { name: r.seeker.name, phone: r.seeker.phone } : null,
  };
}

// One ranked candidate on the seeker's matches map. Name and phone stay
// masked until that donor accepts; pins are rounded to ~1 km.
function serializeMatch(d, { accepted }) {
  const full = resolveDonorContact(d, d.user);
  return {
    _id: d._id,
    bloodGroup: d.bloodGroup,
    area: d.area,
    verified: d.verified,
    trustTier: computeTrustTier(d, d.user),
    isDemo: !!d.isDemo,
    distanceKm: Math.round((d.distanceMeters / 1000) * 10) / 10,
    coordinates: coarsen(d.location.coordinates),
    accepted: !!accepted,
    donor: {
      name: accepted ? full.name : shortName(full.name),
      phone: accepted ? full.phone : null,
      relation: accepted ? full.relation : null,
    },
  };
}

module.exports = {
  shortName, coarsen,
  serializeDonor, serializeSeekerForDonor, serializeContactedDonor,
  serializeRequestForOwner, serializeRequestForHospital, serializeMatch,
};
