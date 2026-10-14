const express = require("express");
const Donor = require("../models/Donor");
const Request = require("../models/Request");
const User = require("../models/User");
const { computeImpact, computeAreaStats } = require("../utils/impact");

// True if any sample data from seed-demo.js is present — the UI must say so.
async function hasDemoData() {
  return !!((await Donor.exists({ isDemo: true })) || (await Request.exists({ isDemo: true })));
}

const router = express.Router();

// Public (no auth) — real platform counts for the landing page and dashboard
// stat cards. No fabricated numbers; whatever isn't true yet just reads 0.
router.get("/", async (req, res) => {
  try {
    const OPEN = ["Searching", "Contacted", "Confirmed"];
    const [totalDonors, availableDonors, totalRequests, fulfilledRequests, byGroupAgg, hospitalPartners, openRequests, criticalOpen] =
      await Promise.all([
        Donor.countDocuments({}),
        Donor.countDocuments({ available: true }),
        Request.countDocuments({}),
        Request.countDocuments({ status: "Fulfilled" }),
        Donor.aggregate([{ $group: { _id: "$bloodGroup", count: { $sum: 1 } } }]),
        User.find({ role: "hospital" }).select("hospitalName").sort({ createdAt: 1 }).limit(12),
        Request.countDocuments({ status: { $in: OPEN } }),
        Request.countDocuments({ status: { $in: OPEN }, urgency: "Critical" }),
      ]);

    const byBloodGroup = Object.fromEntries(byGroupAgg.map((g) => [g._id, g.count]));
    const demoDataIncluded = await hasDemoData();

    res.json({
      totalDonors,
      availableDonors,
      totalRequests,
      fulfilledRequests,
      openRequests,
      criticalOpen,
      demoDataIncluded,
      byBloodGroup,
      hospitalPartners: { count: hospitalPartners.length, names: hospitalPartners.map((h) => h.hospitalName) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load stats" });
  }
});

// Public success metrics from the project brief — aggregates only, no personal data.
router.get("/impact", async (req, res) => {
  try {
    const [requests, donors, hospitalPartners, totalDonors, verifiedDonors, demoDataIncluded] = await Promise.all([
      Request.find({})
        .select("createdAt urgency status closedReason reportedFake contactedDonors.status contactedDonors.respondedAt")
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean(),
      Donor.find({}).select("area available verified").limit(5000).lean(),
      User.countDocuments({ role: "hospital" }),
      Donor.countDocuments({}),
      Donor.countDocuments({ verified: true }),
      hasDemoData(),
    ]);

    res.json({
      ...computeImpact(requests),
      donorsByArea: computeAreaStats(donors),
      totals: { donors: totalDonors, verifiedDonors, hospitalPartners },
      demoDataIncluded,
      generatedAt: new Date(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load impact metrics" });
  }
});

module.exports = router;
