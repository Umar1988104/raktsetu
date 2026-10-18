const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const Request = require("../models/Request");
const Donor = require("../models/Donor");
const verifyToken = require("../middleware/verifyToken");
const { emailGate, hospitalGate, send } = require("../middleware/gates");
const { findRankedDonors } = require("../utils/matching");
const { contactDonors } = require("../utils/notify");
const rules = require("../utils/lifecycleRules");
const { sweepExpiredThrottled, maintainRequest } = require("../utils/lifecycle");
const { escapeRegex } = require("../utils/text");
const { serializeRequestForOwner, serializeRequestForHospital, serializeMatch } = require("../utils/serializers");

const router = express.Router();

// Only what the serializer needs to name a contacted donor (their own
// phone/location etc. never leave the server unless they accepted).
const CONTACTED_POPULATE = {
  path: "contactedDonors.donor",
  select: "familyMemberId bloodGroup",
  populate: { path: "user", select: "name phone familyMembers" },
};

const getCurrentUser = (req) => User.findOne({ firebaseUid: req.user.uid });
const isId = (id) => mongoose.isValidObjectId(id);

// A request this seeker owns, or null.
async function ownedRequest(req, user) {
  if (!isId(req.params.id)) return null;
  return Request.findOne({ _id: req.params.id, seeker: user._id });
}

// Seeker raises a new blood request — optionally on behalf of a family member.
router.post("/", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "seeker") {
      return res.status(403).json({ error: "Only accounts registered with role 'seeker' can create requests" });
    }

    if (user.throttledUntil && user.throttledUntil > new Date()) {
      return res.status(429).json({
        error: `New requests are temporarily blocked on this account until ${user.throttledUntil.toLocaleString()}, after a previous request was reported as fake.`,
      });
    }

    const { bloodGroup, units, urgency, hospital, area, lat, lng, notes, familyMemberId } = req.body;
    if (!bloodGroup || !units || !hospital || !area || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: "bloodGroup, units, hospital, area, lat and lng are required" });
    }

    // Guests: one request per 24h per IP (free to enforce, no SMS needed).
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

    const level = urgency || "Normal";
    const schedule = rules.initialSchedule(level);
    const isCritical = level === "Critical";

    const request = await Request.create({
      seeker: user._id,
      familyMemberId: familyMemberId || null,
      patientName,
      bloodGroup,
      units,
      urgency: level,
      hospital,
      area,
      location: { type: "Point", coordinates: [Number(lng), Number(lat)] },
      notes,
      creatorIp: req.ip,
      expiresAt: schedule.expiresAt,
      // Critical requests wait for hospital verification before any searching.
      nextEscalationAt: isCritical ? null : schedule.nextEscalationAt,
    });

    if (isCritical) {
      return res.status(201).json({ request: serializeRequestForOwner(request), awaitingHospitalVerification: true });
    }

    const { donors } = await findRankedDonors(request, rules.BATCH_SIZE);
    if (donors.length > 0) {
      request.contactedDonors = await contactDonors(request, donors);
      request.status = "Contacted";
      await request.save();
    }

    res.status(201).json({ request: serializeRequestForOwner(request) });
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Failed to create request" });
  }
});

// The logged-in seeker's own requests.
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "seeker") return res.status(403).json({ error: "Only seekers have requests" });

    await sweepExpiredThrottled();
    const requests = await Request.find({ seeker: user._id }).populate(CONTACTED_POPULATE).sort({ createdAt: -1 });
    const now = new Date();
    res.json({ requests: requests.map((r) => serializeRequestForOwner(r, now)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch your requests" });
  }
});

// Hospital partner: Critical requests under their name still awaiting verification.
// (Registered before "/:id" so "pending-verification" isn't read as an id.)
router.get("/pending-verification", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const block = hospitalGate(req, user);
    if (block) return send(res, block);
    await sweepExpiredThrottled();
    const requests = await Request.find({
      urgency: "Critical",
      hospitalVerified: false,
      status: { $in: rules.OPEN_FOR_SEARCH },
      hospital: { $regex: `^${escapeRegex(user.hospitalName)}$`, $options: "i" },
    })
      .populate("seeker", "name phone")
      .sort({ createdAt: -1 });

    res.json({ requests: requests.map(serializeRequestForHospital) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch pending verifications" });
  }
});

// Public, read-only tracking view for a shared link. Minimal on purpose: no
// phone numbers, no donor identities, no patient name, no account details.
router.get("/public/:token", async (req, res) => {
  try {
    const found = await Request.findOne({ shareToken: req.params.token }).select("_id");
    if (!found) return res.status(404).json({ error: "This tracking link isn't valid" });

    await maintainRequest(found._id); // time it out / widen the search if that's due
    const request = await Request.findById(found._id);

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

// One of the seeker's requests (status page).
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!(await ownedRequest(req, user))) return res.status(404).json({ error: "Request not found" });

    await maintainRequest(req.params.id); // time it out / widen the search if that's due
    const request = await Request.findOne({ _id: req.params.id, seeker: user._id }).populate(CONTACTED_POPULATE);
    res.json({ request: serializeRequestForOwner(request) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch request" });
  }
});

// Seeker-confirmed progress: "a donor is coming" or "donation done". Fulfilled
// is the one stage only a human can confirm; it logs a donation for everyone
// who accepted — exactly once.
router.patch("/:id/status", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const { status } = req.body;
    if (!["Confirmed", "Fulfilled"].includes(status)) {
      return res.status(400).json({ error: "status must be 'Confirmed' or 'Fulfilled'" });
    }

    const request = await ownedRequest(req, user);
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (!rules.OPEN_STATUSES.includes(request.status)) {
      return res.status(409).json({ error: `This request is already ${request.status.toLowerCase()}` });
    }
    if (request.urgency === "Critical" && !request.hospitalVerified) {
      return res.status(403).json({ error: "This Critical request is still waiting for hospital verification" });
    }

    request.status = status;
    if (status === "Fulfilled") {
      request.closedAt = new Date();
      request.nextEscalationAt = null;
    }
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

    res.json({ request: serializeRequestForOwner(request) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update request status" });
  }
});

// "Yes, I still need blood" — keeps it open for another full period and gives
// the search another few rounds. Limited so a request can't live forever.
router.post("/:id/extend", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const request = await ownedRequest(req, user);
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (!rules.isOpenForSearch(request)) return res.status(409).json({ error: "This request isn't waiting for donors any more" });
    if ((request.extensions || 0) >= rules.MAX_EXTENSIONS) {
      return res.status(409).json({ error: "This request has already been extended the maximum number of times" });
    }

    const schedule = rules.initialSchedule(request.urgency);
    request.expiresAt = schedule.expiresAt;
    request.extensions = (request.extensions || 0) + 1;
    request.escalationRound = 0;
    request.nextEscalationAt = request.urgency === "Critical" && !request.hospitalVerified ? null : schedule.nextEscalationAt;
    await request.save();

    res.json({ request: serializeRequestForOwner(request) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to extend request" });
  }
});

// "No longer needed" — closes it so donors stop being notified.
router.post("/:id/close", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const request = await ownedRequest(req, user);
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (!rules.isOpenForSearch(request) && request.status !== "Confirmed") {
      return res.status(409).json({ error: "This request is already closed" });
    }

    request.status = "Expired";
    request.closedReason = "Closed by requester";
    request.closedAt = new Date();
    request.nextEscalationAt = null;
    await request.save();

    res.json({ request: serializeRequestForOwner(request) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to close request" });
  }
});

// Donor accepts or declines — naming WHICH of their account's donor profiles
// (self or a family member) is answering. Accepting moves the request to Confirmed.
router.post("/:id/respond", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "donor") return res.status(403).json({ error: "Only donors can respond to requests" });

    const { response, donorId } = req.body;
    if (!["Accepted", "Declined"].includes(response)) {
      return res.status(400).json({ error: "response must be 'Accepted' or 'Declined'" });
    }
    if (!donorId || !isId(donorId)) return res.status(400).json({ error: "donorId is required" });
    if (response === "Accepted") {
      const emailBlock = emailGate(req); // accepting shares the donor's contact details
      if (emailBlock) return send(res, emailBlock);
    }

    const donor = await Donor.findOne({ _id: donorId, user: user._id });
    if (!donor) return res.status(404).json({ error: "That donor profile isn't under your account" });

    if (!isId(req.params.id)) return res.status(404).json({ error: "Request not found" });
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (!rules.OPEN_STATUSES.includes(request.status)) {
      return res.status(409).json({ error: "This request is no longer open" });
    }

    const entry = request.contactedDonors.find((c) => String(c.donor) === String(donor._id));
    if (!entry) return res.status(403).json({ error: "You were not contacted for this request" });
    if (entry.status !== "Pending") return res.status(409).json({ error: `Already responded: ${entry.status}` });

    entry.status = response;
    entry.respondedAt = new Date();
    if (response === "Accepted") {
      request.status = "Confirmed";
      request.nextEscalationAt = null; // someone said yes — stop widening the search
    }
    await request.save();

    res.json({ ok: true, myResponse: response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to respond to request" });
  }
});

// The matching engine's ranked candidates. Names and phones stay masked until
// a donor accepts, and map pins are rounded to ~1 km.
router.get("/:id/matches", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const request = await ownedRequest(req, user);
    if (!request) return res.status(404).json({ error: "Request not found" });

    const { compatibleGroups, donors } = await findRankedDonors(request, 50);
    const acceptedIds = new Set(request.contactedDonors.filter((c) => c.status === "Accepted").map((c) => String(c.donor)));

    res.json({
      request: {
        bloodGroup: request.bloodGroup,
        urgency: request.urgency,
        area: request.area,
        coordinates: request.location.coordinates, // the seeker's own location
      },
      compatibleGroups,
      // Donors who chose to stay off the map are still notified; a seeker only sees them once they accept.
      matches: donors
        .filter((d) => !d.hideFromMap || acceptedIds.has(String(d._id)))
        .map((d) => serializeMatch(d, { accepted: acceptedIds.has(String(d._id)) })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to find matches" });
  }
});

// Hospital partner verifies a Critical request really came from them — this is
// what releases it to the matching engine, with a fresh clock.
router.patch("/:id/verify-hospital", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const block = hospitalGate(req, user);
    if (block) return send(res, block);
    if (!isId(req.params.id)) return res.status(404).json({ error: "Request not found" });

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.hospital.toLowerCase() !== user.hospitalName.toLowerCase()) {
      return res.status(403).json({ error: "This request isn't under your hospital name" });
    }
    if (!rules.isOpenForSearch(request)) return res.status(409).json({ error: "This request is no longer open" });

    const schedule = rules.initialSchedule(request.urgency);
    request.hospitalVerified = true;
    request.expiresAt = schedule.expiresAt;
    request.nextEscalationAt = schedule.nextEscalationAt;
    request.escalationRound = 0;
    await request.save();

    const { donors } = await findRankedDonors(request, rules.BATCH_SIZE);
    if (donors.length > 0) {
      request.contactedDonors = await contactDonors(request, donors);
      request.status = "Contacted";
      await request.save();
    }

    res.json({ request: serializeRequestForHospital(request) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to verify request" });
  }
});

// After fulfilment the seeker can send ONE short private thank-you note to
// everyone who accepted. No contact details change hands.
router.post("/:id/thank-you", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const request = await ownedRequest(req, user);
    if (!request) return res.status(404).json({ error: "Request not found" });

    if (request.status !== "Fulfilled") return res.status(400).json({ error: "You can send a thank-you once the request is marked Fulfilled" });
    if (!request.contactedDonors.some((c) => c.status === "Accepted")) {
      return res.status(400).json({ error: "No donor accepted this request, so there's no one to thank" });
    }
    if (request.thankYouNote?.sentAt) return res.status(409).json({ error: "You've already sent a thank-you for this request" });

    const message = (req.body.message || "").trim();
    if (!message) return res.status(400).json({ error: "Please write a short message" });
    if (message.length > 300) return res.status(400).json({ error: "Keep it under 300 characters" });

    request.thankYouNote = { message, sentAt: new Date() };
    await request.save();
    res.json({ request: serializeRequestForOwner(request) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send thank-you" });
  }
});

// Seeker gets (or creates) the share token for the public tracking link.
router.post("/:id/share", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const request = await ownedRequest(req, user);
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

// A donor who was actually contacted can flag a request as fake. Two
// independent reports close it and block that account for 48 hours.
const REPORTS_TO_EXPIRE = 2;
const THROTTLE_HOURS = 48;

router.post("/:id/report", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "donor") return res.status(403).json({ error: "Only donors can report a request" });
    if (!isId(req.params.id)) return res.status(404).json({ error: "Request not found" });

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    // One account can hold several donor profiles — use whichever was contacted.
    const myDonors = await Donor.find({ user: user._id }).select("_id");
    const contactedMine = myDonors.find((d) => request.contactedDonors.some((c) => String(c.donor) === String(d._id)));
    if (!contactedMine) return res.status(403).json({ error: "You were not contacted for this request" });

    if (!request.reportedBy.some((id) => String(id) === String(contactedMine._id))) {
      request.reportedBy.push(contactedMine._id);
    }

    if (request.reportedBy.length >= REPORTS_TO_EXPIRE && !request.reportedFake) {
      request.reportedFake = true;
      request.status = "Expired";
      request.closedReason = "Reported as fake";
      request.closedAt = new Date();
      request.nextEscalationAt = null;
      await User.findByIdAndUpdate(request.seeker, { throttledUntil: new Date(Date.now() + THROTTLE_HOURS * 3600e3) });
    }

    await request.save();
    res.json({ ok: true, reportCount: request.reportedBy.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to report request" });
  }
});

module.exports = router;
