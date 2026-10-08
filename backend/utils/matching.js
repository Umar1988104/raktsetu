const Donor = require("../models/Donor");
const { compatibleDonorGroupsFor } = require("./bloodCompatibility");
const { getNextEligibleDate } = require("./eligibility");

// Returns compatible, available, actually-eligible donors near `request`,
// closest first. Shared by: the "find matches" view, and auto-contacting
// donors on request creation.
async function findRankedDonors(request, limit = 10) {
  const compatibleGroups = compatibleDonorGroupsFor(request.bloodGroup);

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

  await Donor.populate(candidates, { path: "user", select: "name phone email familyMembers" });

  // Safety net: never contact a donor who, by their own logged donation
  // history, isn't actually past the 90-day cooldown yet — even if their
  // `available` flag says otherwise.
  const eligible = candidates.filter((d) => !getNextEligibleDate(d)).slice(0, limit);

  return { compatibleGroups, donors: eligible };
}

module.exports = { findRankedDonors };
