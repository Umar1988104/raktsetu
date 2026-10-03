const express = require("express");
const Donor = require("../models/Donor");
const Request = require("../models/Request");

const router = express.Router();

// Public (no auth) — real platform counts for the landing page and dashboard
// stat cards. No fabricated numbers; whatever isn't true yet just reads 0.
router.get("/", async (req, res) => {
  try {
    const [totalDonors, availableDonors, totalRequests, fulfilledRequests, byGroupAgg] = await Promise.all([
      Donor.countDocuments({}),
      Donor.countDocuments({ available: true }),
      Request.countDocuments({}),
      Request.countDocuments({ status: "Fulfilled" }),
      Donor.aggregate([{ $group: { _id: "$bloodGroup", count: { $sum: 1 } } }]),
    ]);

    const byBloodGroup = Object.fromEntries(byGroupAgg.map((g) => [g._id, g.count]));

    res.json({ totalDonors, availableDonors, totalRequests, fulfilledRequests, byBloodGroup });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load stats" });
  }
});

module.exports = router;
