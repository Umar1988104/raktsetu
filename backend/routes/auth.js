const express = require("express");
const User = require("../models/User");
const Donor = require("../models/Donor");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

// Called once right after a successful Firebase sign-up on the frontend.
// Creates the RaktSetu profile (name, phone, role) for this Firebase user.
router.post("/register", verifyToken, async (req, res) => {
  try {
    const { name, phone, role, hospitalName } = req.body;

    if (!name || !phone || !["donor", "seeker", "hospital"].includes(role)) {
      return res.status(400).json({ error: "name, phone and a valid role ('donor', 'seeker' or 'hospital') are required" });
    }
    if (role === "hospital" && !hospitalName) {
      return res.status(400).json({ error: "hospitalName is required for role 'hospital'" });
    }

    const existing = await User.findOne({ firebaseUid: req.user.uid });
    if (existing) {
      return res.status(409).json({ error: "Profile already exists for this account", user: existing });
    }

    const user = await User.create({
      firebaseUid: req.user.uid,
      email: req.user.email,
      name,
      phone,
      role,
      hospitalName: role === "hospital" ? hospitalName : undefined,
    });

    res.status(201).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create profile" });
  }
});

// Returns the logged-in user's profile, plus their donor sub-profile if they have one.
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: "No RaktSetu profile yet — call /api/auth/register first" });
    }

    let donor = null;
    if (user.role === "donor") {
      donor = await Donor.findOne({ user: user._id });
    }

    res.json({ user, donor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

module.exports = router;
