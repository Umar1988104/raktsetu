const express = require("express");
const User = require("../models/User");
const Request = require("../models/Request");
const Donor = require("../models/Donor");
const verifyToken = require("../middleware/verifyToken");
const { findRankedDonors } = require("../utils/matching");
const { sendPush } = require("../utils/sendPush");
const { sendEmail } = require("../utils/sendEmail");

const MAX_DONORS_TO_CONTACT = 10;

// Notifies a batch of matched donors (push if they have a token, email otherwise)
// that a compatible request near them is open. Never throws — a notification
// failure must not block the request from being created.
async function contactDonors(request, donors) {
  const notified = [];
  for (const d of donors) {
    const pushResult = await sendPush(d.fcmTokens, {
      title: `${request.bloodGroup} blood needed nearby`,
      body: `${request.units} unit(s) · ${request.urgency} · ${request.hospital}`,
      data: { requestId: String(request._id) },
    });

    if (pushResult.sent === 0 && d.user?.email) {
      await sendEmail({
        to: d.user.email,
        subject: `RaktSetu: a ${request.bloodGroup} request needs your help`,
        text: `A compatible blood request was just raised near you:\n\n${request.units} unit(s) of ${request.bloodGroup}\nUrgency: ${request.urgency}\nHospital: ${request.hospital}\nArea: ${request.area}\n\nLog into RaktSetu and check your Notifications tab to accept or decline.`,
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

    // v0.6 — Critical requests are held back from contacting donors until a
    // hospital partner account verifies them (reduces misuse of the most
    // urgent tier). Normal/Urgent requests contact donors immediately, same
    // as before.
    if (request.urgency === "Critical") {
      return res.status(201).json({ request, awaitingHospitalVerification: true });
    }

    // v0.4/v0.5 — immediately find + notify compatible nearby donors, and
    // move the request to "Contacted" automatically since donors are now
    // actually being reached out to, not just sitting in "Searching".
    const { donors } = await findRankedDonors(request, MAX_DONORS_TO_CONTACT);
    if (donors.length > 0) {
      request.contactedDonors = await contactDonors(request, donors);
      request.status = "Contacted";
      await request.save();
    }

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
    const requests = await Request.find({ seeker: user._id })
      .populate({ path: "contactedDonors.donor", populate: { path: "user", select: "name phone" } })
      .sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch your requests" });
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
      populate: { path: "user", select: "name phone" },
    });
    if (!request) return res.status(404).json({ error: "Request not found" });
    res.json({ request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch request" });
  }
});

// Seeker-triggered status change. Fulfilled is the one stage that genuinely
// needs a human to confirm it (only the seeker knows the donation actually
// happened) — when it's set, every donor who accepted gets a donation-history
// entry logged automatically (v0.5).
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

// Donor accepts or declines a request they were notified about. Accepting
// auto-advances the request to "Confirmed" (v0.5) — no manual step needed.
router.post("/:id/respond", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "donor") {
      return res.status(403).json({ error: "Only donors can respond to requests" });
    }

    const { response } = req.body;
    if (!["Accepted", "Declined"].includes(response)) {
      return res.status(400).json({ error: "response must be 'Accepted' or 'Declined'" });
    }

    const donor = await Donor.findOne({ user: user._id });
    if (!donor) return res.status(404).json({ error: "No donor profile found" });

    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    const entry = request.contactedDonors.find((c) => String(c.donor) === String(donor._id));
    if (!entry) return res.status(403).json({ error: "You were not contacted for this request" });
    if (entry.status !== "Pending") {
      return res.status(409).json({ error: `You already responded: ${entry.status}` });
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
// Urgency doesn't re-sort this list (it's already the seeker's own request),
// but it's echoed back so the frontend can highlight how urgent the search is.
router.get("/:id/matches", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const request = await Request.findOne({ _id: req.params.id, seeker: user._id });
    if (!request) return res.status(404).json({ error: "Request not found" });

    const { compatibleGroups, donors: matches } = await findRankedDonors(request, 50);

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

// Hospital partner account verifies a Critical request actually originated
// from them — this is what releases it to the matching engine (v0.6).
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

    // Now release it to the matching engine, same as a normal-urgency request.
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

module.exports = router;
