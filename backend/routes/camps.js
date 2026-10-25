const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Camp = require("../models/Camp");
const verifyToken = require("../middleware/verifyToken");
const CampRsvp = require("../models/CampRsvp");
const { emailGate, hospitalGate, send } = require("../middleware/gates");
const { escapeRegex } = require("../utils/text");

const router = express.Router();

async function getCurrentUser(req) {
  return User.findOne({ firebaseUid: req.user.uid });
}

// Public (no auth) — anyone can browse upcoming camps, filterable by
// accessibility features (the "Accessible Camp Locator" from Sahyog Mode).
router.get("/", async (req, res) => {
  try {
    const { accessibleOnly, area } = req.query;
    const filter = { date: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }; // hide long-past camps

    if (accessibleOnly === "true") {
      filter["accessibility.wheelchairRamp"] = true;
    }
    if (area) filter.area = { $regex: escapeRegex(String(area).slice(0, 60)), $options: "i" };

    const camps = await Camp.find(filter).sort({ date: 1 }).limit(100);
    res.json({ camps });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch camps" });
  }
});

// Hospital partner account posts a new camp.
router.post("/", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const block = hospitalGate(req, user);
    if (block) return send(res, block);

    const { name, date, address, area, lat, lng, accessibility } = req.body;
    if (!name || !date || !address || !area || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: "name, date, address, area, lat and lng are required" });
    }

    const camp = await Camp.create({
      hospital: user._id,
      hospitalName: user.hospitalName,
      name,
      date,
      address,
      area,
      location: { type: "Point", coordinates: [Number(lng), Number(lat)] },
      accessibility: {
        wheelchairRamp: Boolean(accessibility?.wheelchairRamp),
        groundFloor: Boolean(accessibility?.groundFloor),
        accessibleParking: Boolean(accessibility?.accessibleParking),
      },
    });

    res.status(201).json({ camp });
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Failed to create camp" });
  }
});

// The hospital's own posted camps (for managing their list).
router.get("/mine", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "hospital") {
      return res.status(403).json({ error: "Only hospital accounts have their own camps" });
    }
    const camps = await Camp.find({ hospital: user._id }).sort({ date: 1 });
    // v2.1: hospitals see HOW MANY people said they'll come — never who.
    const counts = await CampRsvp.aggregate([
      { $match: { camp: { $in: camps.map((c) => c._id) } } },
      { $group: { _id: "$camp", n: { $sum: 1 } } },
    ]);
    const byCamp = new Map(counts.map((c) => [String(c._id), c.n]));
    res.json({ camps: camps.map((c) => ({ ...(c.toObject ? c.toObject() : c), rsvpCount: byCamp.get(String(c._id)) || 0 })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch your camps" });
  }
});

// ---- RSVPs (v2.1) ----
const RSVP_PER_MONTH = 30;
const PAST_GRACE_MS = 24 * 60 * 60 * 1000; // same grace as the public list

// Which camps I've said I'll attend (only ids — the page merges them in).
router.get("/rsvps/mine", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(404).json({ error: "Profile not found" });
    const rsvps = await CampRsvp.find({ user: user._id }).select("camp");
    res.json({ campIds: rsvps.map((r) => String(r.camp)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load your RSVPs" });
  }
});

router.post("/:id/rsvp", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(404).json({ error: "Create your profile first" });
    if (user.isGuest) return res.status(403).json({ error: "Save your account first — we email your reminder" });
    if (user.role === "hospital") return res.status(403).json({ error: "Hospital accounts can't RSVP to camps" });
    const gate = emailGate(req); // reminders go to your email, so it must be verified
    if (gate) return send(res, gate);
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Camp not found" });
    const camp = await Camp.findById(req.params.id);
    if (!camp) return res.status(404).json({ error: "Camp not found" });
    if (new Date(camp.date).getTime() < Date.now() - PAST_GRACE_MS) return res.status(400).json({ error: "This camp is already over" });

    const recent = await CampRsvp.countDocuments({ user: user._id, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 3600e3) } });
    const already = await CampRsvp.countDocuments({ camp: camp._id, user: user._id });
    if (!already && recent >= RSVP_PER_MONTH) return res.status(429).json({ error: "That's a lot of RSVPs this month — please keep to the camps you'll really attend" });

    await CampRsvp.updateOne({ camp: camp._id, user: user._id }, { $setOnInsert: { camp: camp._id, user: user._id, reminderSentAt: null } }, { upsert: true });
    res.status(201).json({ going: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save your RSVP" });
  }
});

router.delete("/:id/rsvp", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(404).json({ error: "Profile not found" });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Camp not found" });
    await CampRsvp.deleteOne({ camp: req.params.id, user: user._id });
    res.json({ going: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to cancel your RSVP" });
  }
});

// Edit one of the hospital's own camps (v1.9).
router.patch("/:id", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const block = hospitalGate(req, user);
    if (block) return send(res, block);
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Camp not found" });
    const camp = await Camp.findOne({ _id: req.params.id, hospital: user._id });
    if (!camp) return res.status(404).json({ error: "Camp not found" });

    const { name, date, address, area, lat, lng, accessibility } = req.body;
    if (name !== undefined) camp.name = String(name).trim();
    if (address !== undefined) camp.address = String(address).trim();
    if (area !== undefined) camp.area = String(area).trim();
    if (date !== undefined) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ error: "That date isn't valid" });
      if (d.getTime() !== new Date(camp.date).getTime()) await CampRsvp.updateMany({ camp: camp._id }, { $set: { reminderSentAt: null } }); // new day => remind again
      camp.date = d;
    }
    if (lat !== undefined && lng !== undefined) {
      if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return res.status(400).json({ error: "lat and lng must be numbers" });
      camp.location = { type: "Point", coordinates: [Number(lng), Number(lat)] };
    }
    if (accessibility && typeof accessibility === "object") {
      for (const k of ["wheelchairRamp", "groundFloor", "accessibleParking"]) {
        if (typeof accessibility[k] === "boolean") camp.accessibility[k] = accessibility[k];
      }
    }
    if (!camp.name || !camp.address || !camp.area) return res.status(400).json({ error: "name, address and area can't be empty" });
    await camp.save();
    res.json({ camp });
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Failed to update camp" });
  }
});

router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const block = hospitalGate(req, user);
    if (block) return send(res, block);
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Camp not found" });
    const camp = await Camp.findOne({ _id: req.params.id, hospital: user._id });
    if (!camp) return res.status(404).json({ error: "Camp not found" });
    await camp.deleteOne();
    await CampRsvp.deleteMany({ camp: camp._id });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete camp" });
  }
});

module.exports = router;
