const express = require("express");
const User = require("../models/User");
const Request = require("../models/Request");
const Donor = require("../models/Donor");
const verifyToken = require("../middleware/verifyToken");
const { compatibleDonorGroupsFor } = require("../utils/bloodCompatibility");

const router = express.Router();

async function getCurrentUser(req) {
  return User.findOne({ firebaseUid: req.user.uid });
}

// Seeker raises a new blood request.
router.post("/", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "seeker") {
      return res.status(403).json({ error: "Only accounts registered with role 'seeker' can create requests" });
    }

    const { bloodGroup, units, urgency, hospital, area, lat, lng, notes } = req.body;
    if (!bloodGroup || !units || !hospital || !area || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: "bloodGroup, units, hospital, area, lat and lng are required" });
    }

    const request = await Request.create({
      seeker: user._id,
      bloodGroup,
      units,
      urgency: urgency || "Normal",
      hospital,
      area,
      location: { type: "Point", coordinates: [Number(lng), Number(lat)] },
      notes,
    });

    res.status(201).json({ request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create request" });
  }
});

// The logged-in seeker's own requests (their dashboard / status tracker).
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "seeker") {
      return res.status(403).json({ error: "Only seekers have requests" });
    }
    const requests = await Request.find({ seeker: user._id }).sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch your requests" });
  }
});

// Fetch a single request of the logged-in seeker's (for a request detail/status page).
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const request = await Request.findOne({ _id: req.params.id, seeker: user._id });
    if (!request) return res.status(404).json({ error: "Request not found" });
    res.json({ request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch request" });
  }
});

// Update a request's status (e.g. Contacted -> Confirmed -> Fulfilled).
// Kept simple for v0.2; a dedicated status-tracking flow lands in v0.5.
router.patch("/:id/status", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const { status } = req.body;
    const allowed = ["Searching", "Contacted", "Confirmed", "Fulfilled", "Expired"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${allowed.join(", ")}` });
    }

    const request = await Request.findOne({ _id: req.params.id, seeker: user._id });
    if (!request) return res.status(404).json({ error: "Request not found" });

    request.status = status;
    await request.save();
    res.json({ request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update request status" });
  }
});

// v0.3 — the actual matching engine: compatible blood group + available +
// ranked by real distance from the request's location (closest first).
// Urgency doesn't re-sort this list (it's already the seeker's own request),
// but it's echoed back so the frontend can highlight how urgent the search is.
router.get("/:id/matches", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const request = await Request.findOne({ _id: req.params.id, seeker: user._id });
    if (!request) return res.status(404).json({ error: "Request not found" });

    const compatibleGroups = compatibleDonorGroupsFor(request.bloodGroup);

    const matches = await Donor.aggregate([
      {
        $geoNear: {
          near: request.location,
          distanceField: "distanceMeters",
          spherical: true,
          query: {
            bloodGroup: { $in: compatibleGroups },
            available: true,
          },
        },
      },
      { $limit: 50 },
    ]);

    // $geoNear returns plain objects, not Mongoose docs, so populate separately.
    await Donor.populate(matches, { path: "user", select: "name phone email" });

    const ranked = matches.map((d) => ({
      _id: d._id,
      bloodGroup: d.bloodGroup,
      area: d.area,
      verified: d.verified,
      distanceKm: Math.round((d.distanceMeters / 1000) * 10) / 10,
      coordinates: d.location.coordinates, // [lng, lat]
      donor: d.user,
    }));

    res.json({
      request: {
        bloodGroup: request.bloodGroup,
        urgency: request.urgency,
        area: request.area,
        coordinates: request.location.coordinates, // [lng, lat]
      },
      compatibleGroups,
      matches: ranked,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to find matches" });
  }
});

module.exports = router;
