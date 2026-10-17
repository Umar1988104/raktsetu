const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Request = require("../models/Request");
const verifyToken = require("../middleware/verifyToken");
const { requireAdmin } = require("../middleware/requireAdmin");
const rules = require("../utils/lifecycleRules");

const router = express.Router();
router.use(verifyToken, requireAdmin); // everything below is admin-only

const isId = (id) => mongoose.isValidObjectId(id);

router.get("/overview", async (req, res) => {
  try {
    const now = new Date();
    const [donors, seekers, hospitals, openRequests, reportedRequests, throttledUsers] = await Promise.all([
      User.countDocuments({ role: "donor" }),
      User.countDocuments({ role: "seeker" }),
      User.countDocuments({ role: "hospital" }),
      Request.countDocuments({ status: { $in: rules.OPEN_STATUSES } }),
      Request.countDocuments({ $or: [{ "reportedBy.0": { $exists: true } }, { reportedFake: true }] }),
      User.countDocuments({ throttledUntil: { $gt: now } }),
    ]);
    res.json({ users: { donors, seekers, hospitals }, openRequests, reportedRequests, throttledUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load overview" });
  }
});

// Requests donors have flagged (including ones already taken down).
router.get("/reported", async (req, res) => {
  try {
    const requests = await Request.find({ $or: [{ "reportedBy.0": { $exists: true } }, { reportedFake: true }] })
      .populate("seeker", "name phone isGuest throttledUntil")
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json({
      requests: requests.map((r) => ({
        _id: r._id,
        bloodGroup: r.bloodGroup,
        units: r.units,
        urgency: r.urgency,
        hospital: r.hospital,
        area: r.area,
        status: r.status,
        closedReason: r.closedReason || null,
        reportCount: r.reportedBy.length,
        reportedFake: r.reportedFake,
        createdAt: r.createdAt,
        seeker: r.seeker
          ? { _id: r.seeker._id, name: r.seeker.name, phone: r.seeker.phone, isGuest: r.seeker.isGuest, throttledUntil: r.seeker.throttledUntil }
          : null,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load reported requests" });
  }
});

// Take a request down.
router.post("/requests/:id/close", async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ error: "Request not found" });
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    request.status = "Expired";
    request.closedReason = "Closed by admin";
    request.closedAt = new Date();
    request.nextEscalationAt = null;
    await request.save();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to close request" });
  }
});

// The reports were wrong: clear them, reopen the request if reports closed it,
// and lift the seeker's block.
router.post("/requests/:id/dismiss-reports", async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ error: "Request not found" });
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    const wasClosedByReports = request.closedReason === "Reported as fake";
    request.reportedBy = [];
    request.reportedFake = false;
    if (wasClosedByReports) {
      const schedule = rules.initialSchedule(request.urgency);
      request.status = request.contactedDonors.length > 0 ? "Contacted" : "Searching";
      request.closedReason = undefined;
      request.closedAt = undefined;
      request.expiresAt = schedule.expiresAt;
      request.nextEscalationAt = request.urgency === "Critical" && !request.hospitalVerified ? null : schedule.nextEscalationAt;
      request.escalationRound = 0;
    }
    await request.save();
    await User.findByIdAndUpdate(request.seeker, { throttledUntil: null });
    res.json({ ok: true, reopened: wasClosedByReports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to dismiss reports" });
  }
});

router.get("/throttled", async (req, res) => {
  try {
    const users = await User.find({ throttledUntil: { $gt: new Date() } })
      .select("name phone isGuest throttledUntil")
      .sort({ throttledUntil: -1 })
      .limit(50);
    res.json({ users: users.map((u) => ({ _id: u._id, name: u.name, phone: u.phone, isGuest: u.isGuest, throttledUntil: u.throttledUntil })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load blocked accounts" });
  }
});

router.post("/users/:id/unthrottle", async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ error: "User not found" });
    const user = await User.findByIdAndUpdate(req.params.id, { throttledUntil: null });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to lift block" });
  }
});

// Hospital accounts, so an admin can mark genuine partners. Anyone can sign up
// with role "hospital" and any name, so "Verified Partner" on a card only
// appears after an admin has checked the hospital outside the app.
router.get("/hospitals", async (req, res) => {
  try {
    const hospitals = await User.find({ role: "hospital" }).sort({ createdAt: -1 }).limit(100);
    res.json({
      hospitals: hospitals.map((h) => ({
        _id: h._id,
        name: h.name,
        hospitalName: h.hospitalName || null,
        phone: h.phone,
        partnerVerified: !!h.partnerVerified,
        createdAt: h.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load hospital accounts" });
  }
});

router.patch("/hospitals/:id/partner-verified", async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ error: "Hospital account not found" });
    if (typeof req.body?.verified !== "boolean") return res.status(400).json({ error: "verified (true/false) is required" });
    const hospital = await User.findOne({ _id: req.params.id, role: "hospital" });
    if (!hospital) return res.status(404).json({ error: "Hospital account not found" });
    hospital.partnerVerified = req.body.verified;
    await hospital.save();
    res.json({ hospital: { _id: hospital._id, hospitalName: hospital.hospitalName || null, partnerVerified: hospital.partnerVerified } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update hospital" });
  }
});

module.exports = router;
