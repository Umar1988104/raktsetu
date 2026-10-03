const express = require("express");
const User = require("../models/User");
const Donor = require("../models/Donor");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

// Helper: load the app User doc for the currently authenticated Firebase user.
async function getCurrentUser(req) {
  return User.findOne({ firebaseUid: req.user.uid });
}

// Create or update the logged-in donor's profile (blood group, area, location, availability).
router.post("/", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "donor") {
      return res.status(403).json({ error: "Only accounts registered with role 'donor' can create a donor profile" });
    }

    const { bloodGroup, area, lat, lng, available } = req.body;
    if (!bloodGroup || !area || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: "bloodGroup, area, lat and lng are required" });
    }

    const donor = await Donor.findOneAndUpdate(
      { user: user._id },
      {
        user: user._id,
        bloodGroup,
        area,
        location: { type: "Point", coordinates: [Number(lng), Number(lat)] },
        available: available !== undefined ? Boolean(available) : true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ donor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save donor profile" });
  }
});

// Quick toggle for the "available now" switch on the donor's own dashboard.
router.patch("/me/availability", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "donor") {
      return res.status(403).json({ error: "Only donors can update availability" });
    }

    const donor = await Donor.findOneAndUpdate(
      { user: user._id },
      { available: Boolean(req.body.available) },
      { new: true }
    );

    if (!donor) return res.status(404).json({ error: "Create a donor profile first" });
    res.json({ donor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update availability" });
  }
});

// Manual browse & filter list for seekers (v0.2 — no automatic matching yet).
// Query params: bloodGroup, area (partial text match), availableOnly=true|false
router.get("/", verifyToken, async (req, res) => {
  try {
    const { bloodGroup, area, availableOnly } = req.query;
    const filter = {};

    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (area) filter.area = { $regex: area, $options: "i" };
    if (availableOnly === "true") filter.available = true;

    const donors = await Donor.find(filter)
      .populate("user", "name phone email")
      .sort({ updatedAt: -1})
      .limit(100);

    res.json({ donors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch donors" });
  }
});

// The logged-in donor's own profile (for pre-filling their dashboard form).
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "donor") {
      return res.status(403).json({ error: "Only donors have a donor profile" });
    }
    const donor = await Donor.findOne({ user: user._id });
    res.json({ donor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch your donor profile" });
  }
});

module.exports = router;
