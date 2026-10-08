const express = require("express");
const User = require("../models/User");
const Donor = require("../models/Donor");
const Request = require("../models/Request");
const verifyToken = require("../middleware/verifyToken");
const { resolveDonorContact, maskPhone } = require("../utils/familyHelpers");
const { getNextEligibleDate } = require("../utils/eligibility");
const { computeTrustTier } = require("../utils/trust");

const router = express.Router();

async function getCurrentUser(req) {
  return User.findOne({ firebaseUid: req.user.uid });
}

// Attaches resolved display identity (self or family member), trust tier,
// and eligibility status to a populated donor doc. `maskContact: true` hides
// the phone behind a mask — used for open browsing, never for an actual
// match or a hospital's legitimate verification lookup.
function withDisplay(donorDoc, { maskContact = false } = {}) {
  const d = donorDoc.toObject ? donorDoc.toObject() : donorDoc;
  const display = resolveDonorContact(d, d.user);
  d.display = maskContact ? { ...display, phone: maskPhone(display.phone) } : display;
  d.trustTier = computeTrustTier(d, d.user);
  d.nextEligibleDate = getNextEligibleDate(d);
  return d;
}

// Create or update a donor profile for the account holder, or for one of
// their family members (pass familyMemberId). One account can now have
// several donor profiles this way.
router.post("/", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "donor") {
      return res.status(403).json({ error: "Only accounts registered with role 'donor' can create a donor profile" });
    }

    const { bloodGroup, area, lat, lng, available, familyMemberId } = req.body;
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
        location: { type: "Point", coordinates: [Number(lng), Number(lat)] },
        available: available !== undefined ? Boolean(available) : true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ donor });
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Failed to save donor profile" });
  }
});

// Availability toggle for one specific donor profile (self or a family member's).
// Turning availability ON enforces the real 90-day cooldown from their actual
// donation history, and requires the frontend's eligibility questionnaire to
// have been confirmed — this is a safety check, not just a UI toggle.
router.patch("/:id/availability", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const donor = await Donor.findOne({ _id: req.params.id, user: user._id });
    if (!donor) return res.status(404).json({ error: "Donor profile not found" });

    const wantsAvailable = Boolean(req.body.available);

    if (wantsAvailable) {
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
    res.json({ donor: withDisplay(donor) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update availability" });
  }
});

// Manual browse & filter list for seekers. Query params: bloodGroup, area, availableOnly.
router.get("/", verifyToken, async (req, res) => {
  try {
    const { bloodGroup, area, availableOnly } = req.query;
    const filter = {};

    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (area) filter.area = { $regex: area, $options: "i" };
    if (availableOnly === "true") filter.available = true;

    const donors = await Donor.find(filter)
      .populate("user", "name phone email familyMembers")
      .sort({ updatedAt: -1 })
      .limit(100);

    // Open browsing — mask phone numbers. Full contact only appears once
    // there's an actual matched request (see /:id/matches), or via a
    // hospital's legitimate donor-verification search below.
    res.json({ donors: donors.map((d) => withDisplay(d, { maskContact: true })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch donors" });
  }
});

// Every donor profile under this account (the account holder's own, and/or
// one per family member who donates) — for the Profile page.
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "donor") {
      return res.status(403).json({ error: "Only donors have a donor profile" });
    }
    const donors = await Donor.find({ user: user._id }).populate("user", "name phone email familyMembers");
    res.json({ donors: donors.map(withDisplay) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch your donor profiles" });
  }
});

// Registers a browser push token for this account. Applied to every donor
// profile under the account, since they all share the same login/device.
router.post("/me/fcm-token", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "donor") {
      return res.status(403).json({ error: "Only donors have push tokens" });
    }
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "token is required" });

    await Donor.updateMany({ user: user._id }, { $addToSet: { fcmTokens: token } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save push token" });
  }
});

// Requests any of this account's donor profiles (self or family) were
// matched and notified about — the real accept/decline inbox.
router.get("/me/incoming-requests", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "donor") {
      return res.status(403).json({ error: "Only donors have incoming requests" });
    }
    const myDonors = await Donor.find({ user: user._id });
    if (myDonors.length === 0) return res.json({ incoming: [] });

    const myDonorIds = myDonors.map((d) => d._id);
    const requests = await Request.find({ "contactedDonors.donor": { $in: myDonorIds } })
      .populate("seeker", "name phone")
      .sort({ createdAt: -1 })
      .limit(50);

    const incoming = [];
    for (const r of requests) {
      for (const c of r.contactedDonors) {
        const matchedDonor = myDonors.find((d) => String(d._id) === String(c.donor));
        if (!matchedDonor) continue;
        const display = resolveDonorContact(matchedDonor, user);
        incoming.push({
          requestId: r._id,
          donorId: matchedDonor._id,
          respondingAs: display.isFamilyMember ? display.name : "you",
          bloodGroup: r.bloodGroup,
          units: r.units,
          urgency: r.urgency,
          hospital: r.hospital,
          area: r.area,
          patientName: r.patientName,
          requestStatus: r.status,
          myResponse: c.status,
          notifiedAt: c.notifiedAt,
          seeker: r.seeker,
        });
      }
    }

    res.json({ incoming });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch incoming requests" });
  }
});

// Hospital partner account: search donors by name/phone/email to verify
// someone who donated at their facility.
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
      $or: [
        { name: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { "familyMembers.name": { $regex: q, $options: "i" } },
      ],
    }).select("_id name phone email familyMembers");

    const donors = await Donor.find({ user: { $in: matchingUsers.map((u) => u._id) } })
      .populate("user", "name phone email familyMembers")
      .limit(20);

    res.json({ donors: donors.map(withDisplay) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to search donors" });
  }
});

// Hospital partner account marks a donor profile as verified.
router.patch("/:id/verify", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "hospital") {
      return res.status(403).json({ error: "Only hospital accounts can verify donors" });
    }
    const donor = await Donor.findByIdAndUpdate(req.params.id, { verified: true }, { new: true }).populate(
      "user",
      "name phone email familyMembers"
    );
    if (!donor) return res.status(404).json({ error: "Donor not found" });
    res.json({ donor: withDisplay(donor) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to verify donor" });
  }
});

module.exports = router;
