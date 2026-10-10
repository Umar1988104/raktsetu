const express = require("express");
const crypto = require("crypto");
const User = require("../models/User");
const Request = require("../models/Request");
const Donor = require("../models/Donor");
const verifyToken = require("../middleware/verifyToken");
const { findRankedDonors } = require("../utils/matching");
const { sendPush } = require("../utils/sendPush");
const { sendEmail } = require("../utils/sendEmail");
const { resolveDonorContact } = require("../utils/familyHelpers");
const { computeTrustTier } = require("../utils/trust");

const MAX_DONORS_TO_CONTACT = 10;

// Notifies a batch of matched donors (push if they have a token, email otherwise)
// that a compatible request near them is open. Never throws — a notification
// failure must not block the request from being created.
async function contactDonors(request, donors) {
  const notified = [];
  for (const d of donors) {
    const display = resolveDonorContact(d, d.user);

    const pushResult = await sendPush(d.fcmTokens, {
      title: `${request.bloodGroup} blood needed nearby`,
      body: `${request.units} unit(s) · ${request.urgency} · ${request.hospital}`,
      data: { requestId: String(request._id) },
    });

    if (pushResult.sent === 0 && d.user?.email) {
      const forWhom = display.isFamilyMember ? ` (for ${display.name})` : "";
      await sendEmail({
        to: d.user.email,
        subject: `RaktSetu: a ${request.bloodGroup} request needs your help`,
        text: `A compatible blood request was just raised near you${forWhom}:\n\n${request.units} unit(s) of ${request.bloodGroup}\nUrgency: ${request.urgency}\nHospital: ${request.hospital}\nArea: ${request.area}\n\nLog into RaktSetu and check your Notifications tab to accept or decline.`,
      });
    }

    notified.push({ donor: d._id, status: "Pending" });
  }
  return notified;
}

const router = express.Router();

async function getCurrentUser(req) {
  return User.findOne({ firebaseUid: req.user.uid });
}

// Attaches a resolved display name/relation to each populated contactedDonors
// entry, so the frontend never has to re-derive "which family member" itself.
function withContactedDonorDisplay(requestDoc) {
  const r = requestDoc.toObject ? requestDoc.toObject() : requestDoc;
  r.contactedDonors = (r.contactedDonors || []).map((c) => {
    if (c.donor && c.donor.user) {
      const display = resolveDonorContact(c.donor, c.donor.user);
      return { ...c, donorDisplay: { name: display.name, relation: display.relation } };
    }
    return c;
  });
  return r;
}

// Seeker raises a new blood request — optionally on behalf of a family member.
router.post("/", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "seeker") {
      return res.status(403).json({ error: "Only accounts registered with role 'seeker' can create requests" });
    }

    // Anti-spam (v1.2): a report-triggered cooldown applies to anyone.
    if (user.throttledUntil && user.throttledUntil > new Date()) {
      return res.status(429).json({
        error: `New requests are temporarily blocked on this account until ${user.throttledUntil.toLocaleString()}, after a previous request was reported as fake.`,
      });
    }

    const { bloodGroup, units, urgency, hospital, area, lat, lng, notes, familyMemberId } = req.body;
    if (!bloodGroup || !units || !hospital || !area || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: "bloodGroup, units, hospital, area, lat and lng are required" });
    }

    // Anti-spam (v1.2): guest (anonymous-auth) accounts are limited to one
    // request per 24h per IP address — free to enforce, no SMS/paid service
    // needed, and a real account lifts this limit entirely.
    if (user.isGuest) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentFromIp = await Request.countDocuments({ creatorIp: req.ip, createdAt: { $gte: since } });
      if (recentFromIp > 0) {
        return res.status(429).json({
          error: "Only one guest request per 24 hours from this network. Create a full account for unlimited requests.",
        });
      }
    }

    let patientName = user.name;
    if (familyMemberId) {
      const fm = user.familyMembers.id(familyMemberId);
      if (!fm) return res.status(400).json({ error: "That family member doesn't exist on this account" });
      patientName = fm.name;
    }

    const request = await Request.create({
      seeker: user._id,
      familyMemberId: familyMemberId || null,
      patientName,
      bloodGroup,
      units,
      urgency: urgency || "Normal",
      hospital,
      area,
      location: { type: "Point", coordinates: [Number(lng), Number(lat)] },
      notes,
      creatorIp: req.ip,
    });

    // v0.6 — Critical requests are held back from contacting donors until a
    // hospital partner account verifies them (reduces misuse of the most
    // urgent tier). Normal/Urgent requests contact donors immediately.
    if (request.urgency === "Critical") {
      return res.status(201).json({ request, awaitingHospitalVerification: true });
    }

    const { donors } = await findRankedDonors(request, MAX_DONORS_TO_CONTACT);
    if (donors.length > 0) {
      request.contactedDonors = await contactDonors(request, donors);
      request.status = "Contacted";
      await request.save();
    }

    res.status(201).json({ request });
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
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
    const requests = await Request.find({ seeker: user._id })
      .populate({ path: "contactedDonors.donor", populate: { path: "user", select: "name phone familyMembers" } })
      .sort({ createdAt: -1 });
    res.json({ requests: requests.map(withContactedDonorDisplay) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch your requests" });
  }
});

// Public, read-only tracking view (v1.4) for a request's share link — what a
// seeker pastes into a family WhatsApp group so everyone sees the same live
// status instead of asking "any update?". Deliberately minimal: no phone
// numbers, no donor identities, no patient name, no account details.
router.get("/public/:token", async (req, res) => {
  try {
    const request = await Request.findOne({ shareToken: req.params.token });
    if (!request) return res.status(404).json({ error: "This tracking link isn't valid" });

    res.json({
      bloodGroup: request.bloodGroup,
      units: request.units,
      urgency: request.urgency,
      hospital: request.hospital,
      area: request.area,
      status: request.status,
      awaitingHospitalVerification: request.urgency === "Critical" && !request.hospitalVerified,
      donorsContacted: request.contactedDonors.length,
      donorsAccepted: request.contactedDonors.filter((c) => c.status === "Accepted").length,
      updatedAt: request.updatedAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load tracking info" });
  }
});

// Seeker generates (or fetches the existing) share token for their request.
router.post("/:id/share", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const request = await Request.findOne({ _id: req.params.id, seeker: user._id });
    if (!request) return res.status(404).json({ error: "Request not found" });

    if (!request.shareToken) {
      request.shareToken = crypto.randomBytes(12).toString("hex");
      await request.save();
    }
    res.json({ token: request.shareToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create share link" });
  }
});

// Hospital partner account: Critical requests raised under their hospital
// name, still awaiting verification. Registered BEFORE the generic "/:id"
// route below, or Express would treat "pending-verification" as an :id.
router.get("/pending-verification", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "hospital") {
      return res.status(403).json({ error: "Only hospital accounts can view pending verifications" });
    }

    const requests = await Request.find({
      urgency: "Critical",
      hospitalVerified: false,
      hospital: { $regex: `^${user.hospitalName}$`, $options: "i" },
    })
      .populate("seeker", "name phone")
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch pending verifications" });
  }
});

// Fetch a single request of the logged-in seeker's (for a request detail/status page).
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const request = await Request.findOne({ _id: req.params.id, seeker: user._id }).populate({
      path: "contactedDonors.donor",
      populate: { path: "user", select: "name phone familyMembers" },
    });
    if (!request) return res.status(404).json({ error: "Request not found" });
    res.json({ request: withContactedDonorDisplay(request) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch request" });
  }
});

// Seeker-triggered status change. Fulfilled is the one stage that genuinely
// needs a human to confirm it — when set, every donor who accepted gets a
// donation-history entry logged automatically.
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

    if (status === "Fulfilled") {
      const acceptedDonorIds = request.contactedDonors.filter((c) => c.status === "Accepted").map((c) => c.donor);
      if (acceptedDonorIds.length > 0) {
        await Donor.updateMany(
          { _id: { $in: acceptedDonorIds } },
          { $push: { donationHistory: { date: new Date(), requestId: request._id } } }
        );
      }
    }

    res.json({ request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update request status" });
  }
});

// Donor accepts or declines a request they were notified about — specifying
// WHICH of their account's donor profiles (self or a family member) is
// responding, since one login can now have several. Accepting auto-advances
// the request to "Confirmed".
router.post("/:id/respond", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "donor") {
      return res.status(403).json({ error: "Only donors can respond to requests" });
    }

    const { response, donorId } = req.body;
    if (!["Accepted", "Declined"].includes(response)) {
      return res.status(400).json({ error: "response must be 'Accepted' or 'Declined'" });
    }
    if (!donorId) return res.status(400).json({ error: "donorId is required" });

    const donor = await Donor.findOne({ _id: donorId, user: user._id });
    if (!donor) return res.status(404).json({ error: "That donor profile isn't under your account" });

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    const entry = request.contactedDonors.find((c) => String(c.donor) === String(donor._id));
    if (!entry) return res.status(403).json({ error: "You were not contacted for this request" });
    if (entry.status !== "Pending") {
      return res.status(409).json({ error: `Already responded: ${entry.status}` });
    }

    entry.status = response;
    entry.respondedAt = new Date();

    if (response === "Accepted" && request.status !== "Fulfilled") {
      request.status = "Confirmed";
    }

    await request.save();
    res.json({ request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to respond to request" });
  }
});

// v0.3 — the actual matching engine: compatible blood group + available +
// ranked by real distance from the request's location (closest first).
router.get("/:id/matches", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const request = await Request.findOne({ _id: req.params.id, seeker: user._id });
    if (!request) return res.status(404).json({ error: "Request not found" });

    const { compatibleGroups, donors: matches } = await findRankedDonors(request, 50);

    const ranked = matches.map((d) => {
      const display = resolveDonorContact(d, d.user);
      return {
        _id: d._id,
        bloodGroup: d.bloodGroup,
        area: d.area,
        verified: d.verified,
        trustTier: computeTrustTier(d, d.user),
        distanceKm: Math.round((d.distanceMeters / 1000) * 10) / 10,
        coordinates: d.location.coordinates, // [lng, lat]
        donor: { name: display.name, phone: display.phone, relation: display.relation },
      };
    });

    res.json({
      request: {
        bloodGroup: request.bloodGroup,
        urgency: request.urgency,
        area: request.area,
        coordinates: request.location.coordinates,
      },
      compatibleGroups,
      matches: ranked,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to find matches" });
  }
});

// Hospital partner account verifies a Critical request actually originated
// from them — this is what releases it to the matching engine.
router.patch("/:id/verify-hospital", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "hospital") {
      return res.status(403).json({ error: "Only hospital accounts can verify requests" });
    }

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    if (request.hospital.toLowerCase() !== user.hospitalName.toLowerCase()) {
      return res.status(403).json({ error: "This request isn't under your hospital name" });
    }

    request.hospitalVerified = true;
    await request.save();

    const { donors } = await findRankedDonors(request, MAX_DONORS_TO_CONTACT);
    if (donors.length > 0) {
      request.contactedDonors = await contactDonors(request, donors);
      request.status = "Contacted";
      await request.save();
    }

    res.json({ request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to verify request" });
  }
});

// After a request is fulfilled, the seeker can send one short private thank-you
// note to every donor who accepted (v1.4). It shows up in those donors'
// Notifications inbox — no phone numbers or other contact details are shared.
router.post("/:id/thank-you", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const request = await Request.findOne({ _id: req.params.id, seeker: user._id });
    if (!request) return res.status(404).json({ error: "Request not found" });

    if (request.status !== "Fulfilled") {
      return res.status(400).json({ error: "You can send a thank-you once the request is marked Fulfilled" });
    }
    if (!request.contactedDonors.some((c) => c.status === "Accepted")) {
      return res.status(400).json({ error: "No donor accepted this request, so there's no one to thank" });
    }
    if (request.thankYouNote?.sentAt) {
      return res.status(409).json({ error: "You've already sent a thank-you for this request" });
    }

    const message = (req.body.message || "").trim();
    if (!message) return res.status(400).json({ error: "Please write a short message" });
    if (message.length > 300) return res.status(400).json({ error: "Keep it under 300 characters" });

    request.thankYouNote = { message, sentAt: new Date() };
    await request.save();
    res.json({ request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send thank-you" });
  }
});

// A donor who was actually contacted for this request can flag it as fake.
// Two independent reports auto-expires the request and throttles the
// seeker's account from creating new ones for 48 hours (v1.2 anti-spam).
const REPORTS_TO_EXPIRE = 2;
const THROTTLE_HOURS = 48;

router.post("/:id/report", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "donor") {
      return res.status(403).json({ error: "Only donors can report a request" });
    }

    const donor = await Donor.findOne({ user: user._id });
    if (!donor) return res.status(404).json({ error: "No donor profile found" });

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    const wasContacted = request.contactedDonors.some((c) => String(c.donor) === String(donor._id));
    if (!wasContacted) return res.status(403).json({ error: "You were not contacted for this request" });

    if (!request.reportedBy.some((id) => String(id) === String(donor._id))) {
      request.reportedBy.push(donor._id);
    }

    if (request.reportedBy.length >= REPORTS_TO_EXPIRE && !request.reportedFake) {
      request.reportedFake = true;
      request.status = "Expired";
      await User.findByIdAndUpdate(request.seeker, {
        throttledUntil: new Date(Date.now() + THROTTLE_HOURS * 60 * 60 * 1000),
      });
    }

    await request.save();
    res.json({ request, reportCount: request.reportedBy.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to report request" });
  }
});

module.exports = router;
