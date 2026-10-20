const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Camp = require("../models/Camp");
const verifyToken = require("../middleware/verifyToken");
const { hospitalGate, send } = require("../middleware/gates");

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
    if (area) filter.area = { $regex: area, $options: "i" };

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
    res.json({ camps });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch your camps" });
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
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete camp" });
  }
});

module.exports = router;
