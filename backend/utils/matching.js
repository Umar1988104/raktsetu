const Donor = require("../models/Donor");
const { compatibleDonorGroupsFor } = require("./bloodCompatibility");

// Returns compatible, available donors near `request`, closest first.
// Shared by: the "find matches" view, and auto-contacting donors on request creation.
async function findRankedDonors(request, limit = 10) {
  const compatibleGroups = compatibleDonorGroupsFor(request.bloodGroup);

  const matches = await Donor.aggregate([
    {
      $geoNear: {
        near: request.location,
        distanceField: "distanceMeters",
        spherical: true,
        query: { bloodGroup: { $in: compatibleGroups }, available: true },
      },
    },
    { $limit: limit },
  ]);

  await Donor.populate(matches, { path: "user", select: "name phone email" });
  return { compatibleGroups, donors: matches };
}

module.exports = { findRankedDonors };
