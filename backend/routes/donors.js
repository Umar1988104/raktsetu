const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Donor = require("../models/Donor");
const Request = require("../models/Request");
const verifyToken = require("../middleware/verifyToken");
const { emailGate, hospitalGate, send } = require("../middleware/gates");
const { resolveDonorContact } = require("../utils/familyHelpers");
const { getNextEligibleDate } = require("../utils/eligibility");
const { parseSchedule } = require("../utils/schedule");
const { escapeRegex } = require("../utils/text");
const { serializeDonor, serializeSeekerForDonor } = require("../utils/serializers");
const rules = require("../utils/lifecycleRules");

const router = express.Router();

// Fields we need from the account to work out names and trust tier. They are
// only ever read here — serializeDonor decides what actually leaves the server.
const USER_FIELDS = "name phone email familyMembers photo address alternatePhone";
const isId = (id) => mongoose.isValidObjectId(id);
const getCurrentUser = (req) => User.findOne({ firebaseUid: req.user.uid });

// Create or update a donor profile for the account holder, or for one of
// their family members (pass familyMemberId).
router.post("/", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "donor") {
      return res.status(403).json({ error: "Only accounts registered with role 'donor' can create a donor profile" });
    }
    const emailBlock = emailGate(req);
    if (emailBlock) return send(res, emailBlock);

    const { bloodGroup, area, lat, lng, available, familyMemberId, sex } = req.body;
    if (!bloodGroup || !area || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: "bloodGroup, area, lat and lng are required" });
    }
    if (familyMemberId && !user.familyMembers.id(familyMemberId)) {
      return res.status(400).json({ error: "That family member doesn't exist on this account" });
    }

    const donor = await Donor.findOneAndUpdate(
      { user: user._id, familyMemberId: familyMemberId || null },
      {
        user: user._id,
        familyMemberId: familyMemberId || null,
        bloodGroup,
        area,
        sex: ["male", "female"].includes(sex) ? sex : null,
        location: { type: "Point", coordinates: [Number(lng), Number(lat)] },
        available: available !== undefined ? Boolean(available) : true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    await donor.populate("user", USER_FIELDS);

    res.json({ donor: serializeDonor(donor, "self") });
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Failed to save donor profile" });
  }
});

// Availability toggle for one donor profile. Turning it ON enforces the real
// donation gap from their logged history, and needs the eligibility check.
router.patch("/:id/availability", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!isId(req.params.id)) return res.status(404).json({ error: "Donor profile not found" });
    const donor = await Donor.findOne({ _id: req.params.id, user: user._id });
    if (!donor) return res.status(404).json({ error: "Donor profile not found" });

    const wantsAvailable = Boolean(req.body.available);
    if (wantsAvailable) {
      const emailBlock = emailGate(req);
      if (emailBlock) return send(res, emailBlock);
      const nextEligible = getNextEligibleDate(donor);
      if (nextEligible) {
        return res.status(400).json({
          error: `Not yet eligible to donate again — next eligible date: ${nextEligible.toLocaleDateString()}`,
          nextEligibleDate: nextEligible,
        });
      }
      if (!req.body.eligibilityConfirmed) {
        return res.status(400).json({ error: "Please confirm the eligibility questions first" });
      }
    }

    donor.available = wantsAvailable;
    await donor.save();
    await donor.populate("user", USER_FIELDS);
    res.json({ donor: serializeDonor(donor, "self") });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update availability" });
  }
});

// Open browsing for seekers: short names, masked phones, no emails, no exact
// locations, no push tokens — only what serializeDonor("public") allows.
router.get("/", verifyToken, async (req, res) => {
  try {
    const { bloodGroup, area, availableOnly } = req.query;
    const filter = { hideFromMap: { $ne: true } }; // donors who chose to stay off the map are still matched, just not browsable
    if (bloodGroup) filter.bloodGroup = String(bloodGroup);
    if (area) filter.area = { $regex: escapeRegex(area), $options: "i" };
    if (availableOnly === "true") filter.available = true;

    const donors = await Donor.find(filter).populate("user", USER_FIELDS).sort({ updatedAt: -1 }).limit(100);
    res.json({ donors: donors.map((d) => serializeDonor(d, "public")) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch donors" });
  }
});

// When may this donor be contacted? (v1.9) Emergencies-only and quiet hours.
router.patch("/:id/schedule", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(404).json({ error: "Donor profile not found" });
    if (!isId(req.params.id)) return res.status(404).json({ error: "Donor profile not found" });
    const parsed = parseSchedule(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const donor = await Donor.findOne({ _id: req.params.id, user: user._id });
    if (!donor) return res.status(404).json({ error: "Donor profile not found" });

    donor.schedule = donor.schedule || {};
    if (parsed.value.emergenciesOnly !== undefined) donor.schedule.emergenciesOnly = parsed.value.emergenciesOnly;
    if (parsed.value.quietHours) donor.schedule.quietHours = parsed.value.quietHours;
    await donor.save();
    await donor.populate("user", USER_FIELDS);
    res.json({ donor: serializeDonor(donor, "self") });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update your schedule" });
  }
});

// Hospital partner: verify several donors at once (v1.9). Up to 25 per call.
router.patch("/verify-many", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const block = hospitalGate(req, user);
    if (block) return send(res, block);

    const ids = Array.isArray(req.body.donorIds) ? req.body.donorIds : [];
    if (ids.length === 0) return res.status(400).json({ error: "Choose at least one donor" });
    if (ids.length > 25) return res.status(400).json({ error: "You can verify up to 25 donors at a time" });
    if (!ids.every((id) => isId(id))) return res.status(400).json({ error: "One of the donor ids isn't valid" });

    const unique = [...new Set(ids.map(String))];
    const result = await Donor.updateMany({ _id: { $in: unique } }, { verified: true });
    res.json({ requested: unique.length, verified: result.modifiedCount ?? result.nModified ?? 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to verify donors" });
  }
});

// A donor can stay OFF the open browse list and the seeker's match map while
// still being matched and notified for real requests. They show up to a
// seeker only after accepting.
router.patch("/:id/map-visibility", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(404).json({ error: "Donor profile not found" });
    if (!isId(req.params.id)) return res.status(404).json({ error: "Donor profile not found" });
    if (typeof req.body.hidden !== "boolean") return res.status(400).json({ error: "hidden (true/false) is required" });
    const donor = await Donor.findOne({ _id: req.params.id, user: user._id });
    if (!donor) return res.status(404).json({ error: "Donor profile not found" });

    donor.hideFromMap = req.body.hidden;
    await donor.save();
    await donor.populate("user", USER_FIELDS);
    res.json({ donor: serializeDonor(donor, "self") });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update map visibility" });
  }
});

// Every donor profile under this account (own data).
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "donor") return res.status(403).json({ error: "Only donors have a donor profile" });
    const donors = await Donor.find({ user: user._id }).populate("user", USER_FIELDS);
    res.json({ donors: donors.map((d) => serializeDonor(d, "self")) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch your donor profiles" });
  }
});

// Registers a browser push token for this account (applied to all its donor profiles).
router.post("/me/fcm-token", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "donor") return res.status(403).json({ error: "Only donors have push tokens" });
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "token is required" });
    await Donor.updateMany({ user: user._id }, { $addToSet: { fcmTokens: token } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save push token" });
  }
});

// The accept/decline inbox. The requester's phone is only shown once this
// donor has accepted; closed requests are flagged so they can't be answered.
router.get("/me/incoming-requests", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "donor") return res.status(403).json({ error: "Only donors have incoming requests" });

    const myDonors = await Donor.find({ user: user._id });
    if (myDonors.length === 0) return res.json({ incoming: [] });

    const requests = await Request.find({ "contactedDonors.donor": { $in: myDonors.map((d) => d._id) } })
      .populate("seeker", "name phone")
      .sort({ createdAt: -1 })
      .limit(50);

    const incoming = [];
    for (const r of requests) {
      for (const c of r.contactedDonors) {
        const matchedDonor = myDonors.find((d) => String(d._id) === String(c.donor));
        if (!matchedDonor) continue;
        const display = resolveDonorContact(matchedDonor, user);
        const accepted = c.status === "Accepted";
        incoming.push({
          requestId: r._id,
          donorId: matchedDonor._id,
          respondingAs: display.isFamilyMember ? display.name : "you",
          bloodGroup: r.bloodGroup,
          component: r.component || "Whole blood",
          neededBy: r.neededBy || null,
          units: r.units,
          urgency: r.urgency,
          hospital: r.hospital,
          area: r.area,
          patientName: r.patientName,
          requestStatus: r.status,
          closed: !rules.OPEN_STATUSES.includes(r.status),
          myResponse: c.status,
          notifiedAt: c.notifiedAt,
          thankYouNote: accepted && r.thankYouNote?.sentAt ? r.thankYouNote : null,
          seeker: serializeSeekerForDonor(r.seeker, accepted),
        });
      }
    }
    res.json({ incoming });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch incoming requests" });
  }
});

// A donor's own logged donations (for the printable acknowledgement).
router.get("/:id/donations", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!isId(req.params.id)) return res.status(404).json({ error: "Donor profile not found" });
    const donor = await Donor.findOne({ _id: req.params.id, user: user._id }).populate(
      "donationHistory.requestId",
      "hospital bloodGroup area"
    );
    if (!donor) return res.status(404).json({ error: "Donor profile not found" });

    const display = resolveDonorContact(donor, user);
    res.json({
      donorName: display.name,
      donorBloodGroup: donor.bloodGroup,
      donations: donor.donationHistory.map((h) => ({
        _id: h._id,
        date: h.date,
        hospital: h.requestId?.hospital || null,
        area: h.requestId?.area || null,
        bloodGroup: h.requestId?.bloodGroup || donor.bloodGroup,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch donations" });
  }
});

// Hospital partner: find a donor to verify. Sees full name and phone (a
// legitimate need), but never email, push tokens or exact location.
router.get("/search", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const block = hospitalGate(req, user);
    if (block) return send(res, block);
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.json({ donors: [] });

    const rx = { $regex: escapeRegex(q), $options: "i" };
    const matchingUsers = await User.find({
      role: "donor",
      $or: [{ name: rx }, { phone: rx }, { email: rx }, { "familyMembers.name": rx }],
    }).select("_id");

    const donors = await Donor.find({ user: { $in: matchingUsers.map((u) => u._id) } })
      .populate("user", USER_FIELDS)
      .limit(20);
    res.json({ donors: donors.map((d) => serializeDonor(d, "hospital")) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to search donors" });
  }
});

// Hospital partner marks a donor profile as verified.
router.patch("/:id/verify", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const block = hospitalGate(req, user);
    if (block) return send(res, block);
    if (!isId(req.params.id)) return res.status(404).json({ error: "Donor not found" });

    const donor = await Donor.findByIdAndUpdate(req.params.id, { verified: true }, { new: true }).populate("user", USER_FIELDS);
    if (!donor) return res.status(404).json({ error: "Donor not found" });
    res.json({ donor: serializeDonor(donor, "hospital") });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to verify donor" });
  }
});

module.exports = router;
