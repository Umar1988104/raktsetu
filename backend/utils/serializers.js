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
    hideFromMap: !!d.hideFromMap,
    schedule: {
      emergenciesOnly: !!(d.schedule && d.schedule.emergenciesOnly),
      quietHours: {
        enabled: !!(d.schedule && d.schedule.quietHours && d.schedule.quietHours.enabled),
        start: (d.schedule && d.schedule.quietHours && d.schedule.quietHours.start) || "22:00",
        end: (d.schedule && d.schedule.quietHours && d.schedule.quietHours.end) || "07:00",
      },
    },
    location: d.location ? { coordinates: d.location.coordinates } : undefined,
    donationHistory: (d.donationHistory || []).map((h) => ({ _id: h._id, date: h.date })),
    nextEligibleDate: getNextEligibleDate(d),
    // Donated before, gap is over, and not currently available: nudge them (v1.9).
    eligibleAgain: (d.donationHistory || []).length > 0 && !getNextEligibleDate(d) && d.available === false,
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
    component: r.component || "Whole blood",
    units: r.units,
    urgency: r.urgency,
    hospital: r.hospital,
    area: r.area,
    notes: r.notes,
    patientName: r.patientName,
    familyMemberId: r.familyMemberId || null,
    neededBy: r.neededBy || null,
    fromRecurringPlan: !!r.recurringPlan,
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
    component: r.component || "Whole blood",
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

// ---------------------------------------------------------------------------
// Member cards (v1.7)
// ---------------------------------------------------------------------------

// The owner looking at their own card. Includes their own emergency contact
// and photo (nobody else ever gets these).
function serializeOwnCard(view) {
  const c = view.card;
  const base = {
    cardId: c.cardId,
    kind: view.kind,
    isSelf: view.isSelf,
    name: view.name,
    shortName: shortName(view.name),
    memberSince: view.memberSince,
    settings: {
      hidden: !!c.hidden,
      show: {
        name: c.show?.name !== false,
        bloodGroup: c.show?.bloodGroup !== false,
        tier: c.show?.tier !== false,
        verified: c.show?.verified !== false,
        memberSince: !!c.show?.memberSince,
        eligibleToday: !!c.show?.eligibleToday,
      },
    },
    regeneratedAt: c.regeneratedAt || null,
  };
  if (view.kind === "partner") {
    return { ...base, hospitalName: view.hospitalName, partnerVerified: view.partnerVerified };
  }
  return {
    ...base,
    relation: view.relation,
    bloodGroup: view.bloodGroup,
    tier: view.tier,
    verified: view.verified,
    hasDonorProfile: view.hasDonorProfile,
    stamps: (view.stamps || []).map((d) => ({ date: d })),
    nextEligibleDate: view.nextEligibleDate,
    eligibleToday: view.eligibleToday,
    photo: view.photo,
    emergencyContact: {
      enabled: !!c.emergencyContact?.enabled,
      name: c.emergencyContact?.name || "",
      phone: c.emergencyContact?.phone || "",
    },
  };
}

// What anyone holding the card ID may see. Every field is gated by an owner
// toggle; nothing else exists in this response — no phone, email, address,
// account id, family names, emergency contact, photo or exact dates.
function serializePublicCard(view) {
  const c = view.card;
  const show = c.show || {};
  if (view.kind === "partner") {
    return { kind: "partner", hospitalName: view.hospitalName, verifiedPartner: !!view.partnerVerified };
  }
  const out = { kind: "member" };
  if (show.name !== false) out.name = shortName(view.name);
  if (show.bloodGroup !== false && view.bloodGroup) out.bloodGroup = view.bloodGroup;
  if (show.tier !== false) out.tier = view.tier;
  if (show.verified !== false) out.verified = !!view.verified;
  if (show.memberSince && view.memberSince) out.memberSinceYear = new Date(view.memberSince).getFullYear();
  if (show.eligibleToday && view.eligibleToday !== null) out.eligibleToday = !!view.eligibleToday;
  return out;
}

module.exports = {
  shortName, coarsen,
  serializeDonor, serializeSeekerForDonor, serializeContactedDonor,
  serializeRequestForOwner, serializeRequestForHospital, serializeMatch,
  serializeOwnCard, serializePublicCard,
};
