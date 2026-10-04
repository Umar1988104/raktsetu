const express = require("express");
const User = require("../models/User");
const Donor = require("../models/Donor");
const Request = require("../models/Request");
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

// Registers a browser push token for this donor (if they've set up push).
// Safe to call repeatedly — tokens are deduped.
router.post("/me/fcm-token", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "donor") {
      return res.status(403).json({ error: "Only donors have push tokens" });
    }
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "token is required" });

    await Donor.updateOne({ user: user._id }, { $addToSet: { fcmTokens: token } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save push token" });
  }
});

// Requests this donor was auto-matched and notified about — the real
// accept/decline inbox (v0.4), shown on the Notifications page.
router.get("/me/incoming-requests", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "donor") {
      return res.status(403).json({ error: "Only donors have incoming requests" });
    }
    const donor = await Donor.findOne({ user: user._id });
    if (!donor) return res.json({ incoming: [] });

    const requests = await Request.find({ "contactedDonors.donor": donor._id })
      .populate("seeker", "name phone")
      .sort({ createdAt: -1 })
      .limit(50);

    const incoming = requests.map((r) => {
      const mine = r.contactedDonors.find((c) => String(c.donor) === String(donor._id));
      return {
        requestId: r._id,
        bloodGroup: r.bloodGroup,
        units: r.units,
        urgency: r.urgency,
        hospital: r.hospital,
        area: r.area,
        requestStatus: r.status,
        myResponse: mine.status,
        notifiedAt: mine.notifiedAt,
        seeker: r.seeker,
      };
    });

    res.json({ incoming });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch incoming requests" });
  }
});

// Hospital partner account: search donors by name/phone/email to verify
// someone who donated at their facility (v0.6 — donor verification badge).
router.get("/search", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "hospital") {
      return res.status(403).json({ error: "Only hospital accounts can search donors to verify" });
    }
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ donors: [] });

    const matchingUsers = await User.find({
      role: "donor",
      $or: [{ name: { $regex: q, $options: "i" } }, { phone: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }],
    }).select("_id");

    const donors = await Donor.find({ user: { $in: matchingUsers.map((u) => u._id) } })
      .populate("user", "name phone email")
      .limit(20);

    res.json({ donors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to search donors" });
  }
});

// Hospital partner account marks a donor as verified.
router.patch("/:id/verify", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "hospital") {
      return res.status(403).json({ error: "Only hospital accounts can verify donors" });
    }
    const donor = await Donor.findByIdAndUpdate(req.params.id, { verified: true }, { new: true }).populate(
      "user",
      "name phone email"
    );
    if (!donor) return res.status(404).json({ error: "Donor not found" });
    res.json({ donor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to verify donor" });
  }
});

module.exports = router;
