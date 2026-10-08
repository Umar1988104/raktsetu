const express = require("express");
const User = require("../models/User");
const Donor = require("../models/Donor");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

// Keeps the stored photo small on purpose — this is a free-tier MongoDB
// document field, not real object storage, so it must stay tiny.
// ~130,000 base64 chars ≈ 95KB raw, plenty for a compressed thumbnail.
const MAX_PHOTO_CHARS = 130000;

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
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Failed to create profile" });
  }
});

// Lightweight registration for the guest emergency-request flow (v1.2).
// The frontend signs the person in anonymously via Firebase first — this
// just attaches a name/phone to that session so a request can be created.
// No email, no role choice — always a seeker.
router.post("/guest-register", verifyToken, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).json({ error: "name and phone are required" });

    const existing = await User.findOne({ firebaseUid: req.user.uid });
    if (existing) return res.json({ user: existing }); // idempotent — guest came back mid-flow

    const user = await User.create({
      firebaseUid: req.user.uid,
      name,
      phone,
      role: "seeker",
      isGuest: true,
    });

    res.status(201).json({ user });
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Failed to create guest profile" });
  }
});

// Returns the logged-in user's profile, plus every donor profile under this
// account (the account holder's own, and/or one per family member who donates).
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) {
      return res.status(404).json({ error: "No RaktSetu profile yet — call /api/auth/register first" });
    }

    let donors = [];
    if (user.role === "donor") {
      donors = await Donor.find({ user: user._id });
    }

    res.json({ user, donors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Edit the account holder's own core profile fields.
router.patch("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ error: "Profile not found" });

    const { name, phone, alternatePhone, address, photo } = req.body;

    if (photo !== undefined && photo && photo.length > MAX_PHOTO_CHARS) {
      return res.status(400).json({ error: "Photo is too large — please use a smaller image" });
    }

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (alternatePhone !== undefined) user.alternatePhone = alternatePhone;
    if (address !== undefined) user.address = address;
    if (photo !== undefined) user.photo = photo;

    await user.save();
    res.json({ user });
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// --- Family members: one login can manage multiple people (v1.1) ---

router.post("/me/family", verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ error: "Profile not found" });

    const { name, relation, bloodGroup, phone, recurringCare } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    user.familyMembers.push({ name, relation, bloodGroup, phone: phone || undefined, recurringCare });
    await user.save();
    res.status(201).json({ user });
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Failed to add family member" });
  }
});

router.patch("/me/family/:memberId", verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ error: "Profile not found" });

    const member = user.familyMembers.id(req.params.memberId);
    if (!member) return res.status(404).json({ error: "Family member not found" });

    const { name, relation, bloodGroup, phone, recurringCare } = req.body;
    if (name !== undefined) member.name = name;
    if (relation !== undefined) member.relation = relation;
    if (bloodGroup !== undefined) member.bloodGroup = bloodGroup;
    if (phone !== undefined) member.phone = phone;
    if (recurringCare !== undefined) member.recurringCare = recurringCare;

    await user.save();
    res.json({ user });
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Failed to update family member" });
  }
});

router.delete("/me/family/:memberId", verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ error: "Profile not found" });

    const member = user.familyMembers.id(req.params.memberId);
    if (!member) return res.status(404).json({ error: "Family member not found" });

    member.deleteOne();
    await user.save();

    // Cascade: remove any donor profile that represented this family member,
    // so nothing is left pointing at a person who no longer exists on the account.
    await Donor.deleteMany({ user: user._id, familyMemberId: req.params.memberId });

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove family member" });
  }
});

module.exports = router;
