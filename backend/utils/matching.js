const Donor = require("../models/Donor");
const { compatibleDonorGroupsFor } = require("./bloodCompatibility");
const { getNextEligibleDate } = require("./eligibility");
const { isDonorReachable } = require("./schedule");

// Returns compatible, available, actually-eligible donors near `request`,
// closest first. Shared by: the "find matches" view, and auto-contacting
// donors on request creation.
// `respectSchedule: true` (used when actually contacting donors) also skips
// donors whose own schedule says not now (quiet hours / emergencies only).
// The seeker's "nearby donors" view does not set it: it shows who is nearby.
async function findRankedDonors(request, limit = 10, { respectSchedule = false, now = new Date() } = {}) {
  const compatibleGroups = compatibleDonorGroupsFor(request.bloodGroup, request.component);

  // Over-fetch, since the eligibility safety-net below may drop some —
  // `available: true` alone isn't trusted as the only gate.
  const candidates = await Donor.aggregate([
    {
      $geoNear: {
        near: request.location,
        distanceField: "distanceMeters",
        spherical: true,
        query: { bloodGroup: { $in: compatibleGroups }, available: true },
      },
    },
    { $limit: limit * 3 },
  ]);

  await Donor.populate(candidates, { path: "user", select: "name phone email familyMembers photo address alternatePhone" });

  // Safety net: never contact a donor who, by their own logged donation
  // history, isn't actually past the 90-day cooldown yet — even if their
  // `available` flag says otherwise.
  const eligible = candidates
    .filter((d) => !getNextEligibleDate(d))
    .filter((d) => !respectSchedule || isDonorReachable(d, request, now))
    .slice(0, limit);

  return { compatibleGroups, donors: eligible };
}

module.exports = { findRankedDonors };
