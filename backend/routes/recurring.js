const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const RecurringPlan = require("../models/RecurringPlan");
const Donor = require("../models/Donor");
const verifyToken = require("../middleware/verifyToken");
const { emailGate, send } = require("../middleware/gates");
const { COMPONENTS } = require("../utils/bloodCompatibility");
const { MAX_ACTIVE_PLANS } = require("../utils/recurring");

const router = express.Router();
const isId = (id) => mongoose.isValidObjectId(id);
const MAX_AHEAD_DAYS = 120;

// Only what the owner needs (never the stored coordinates).
function serializePlan(p) {
  const o = p.toObject ? p.toObject() : p;
  return {
    _id: o._id,
    patientName: o.patientName,
    familyMemberId: o.familyMemberId || null,
    bloodGroup: o.bloodGroup,
    component: o.component,
    units: o.units,
    hospital: o.hospital,
    area: o.area,
    notes: o.notes || "",
    everyWeeks: o.everyWeeks,
    nextNeededAt: o.nextNeededAt,
    active: o.active,
    createdAt: o.createdAt,
  };
}

async function currentSeeker(req, res) {
  const user = await User.findOne({ firebaseUid: req.user.uid });
  if (!user || user.role !== "seeker") {
    res.status(403).json({ error: "Only seeker accounts can have repeating requests" });
    return null;
  }
  if (user.isGuest) {
    res.status(403).json({ error: "Save your account first — repeating requests need a full account" });
    return null;
  }
  return user;
}

router.get("/", verifyToken, async (req, res) => {
  try {
    const user = await currentSeeker(req, res);
    if (!user) return;
    const plans = await RecurringPlan.find({ seeker: user._id }).sort({ nextNeededAt: 1 }).limit(20);
    res.json({ plans: plans.map(serializePlan) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load your repeating requests" });
  }
});

router.post("/", verifyToken, async (req, res) => {
  try {
    const user = await currentSeeker(req, res);
    if (!user) return;
    // Repeating requests contact donors over and over, so the email must be real.
    const gate = emailGate(req);
    if (gate) return send(res, gate);

    const { bloodGroup, units, hospital, area, lat, lng, notes, familyMemberId, everyWeeks, firstNeededAt } = req.body;
    const component = req.body.component || "Whole blood";
    if (!Donor.BLOOD_GROUPS.includes(bloodGroup)) return res.status(400).json({ error: "Choose a valid blood group" });
    if (!COMPONENTS.includes(component)) return res.status(400).json({ error: `component must be one of: ${COMPONENTS.join(", ")}` });
    const u = Number(units);
    if (!Number.isInteger(u) || u < 1 || u > 10) return res.status(400).json({ error: "Units must be a whole number from 1 to 10" });
    if (!hospital || !area) return res.status(400).json({ error: "hospital and area are required" });
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return res.status(400).json({ error: "lat and lng are required" });
    const weeks = Number(everyWeeks);
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > 12) return res.status(400).json({ error: "Repeat every 1 to 12 weeks" });

    const first = new Date(firstNeededAt);
    if (Number.isNaN(first.getTime()) || first.getTime() <= Date.now()) return res.status(400).json({ error: "The first date must be in the future" });
    if (first.getTime() - Date.now() > MAX_AHEAD_DAYS * 24 * 3600e3) return res.status(400).json({ error: `The first date can be at most ${MAX_AHEAD_DAYS} days away` });

    let patientName = user.name;
    if (familyMemberId) {
      const fm = user.familyMembers.id(familyMemberId);
      if (!fm) return res.status(400).json({ error: "That family member doesn't exist on this account" });
      patientName = fm.name;
    }

    const active = await RecurringPlan.countDocuments({ seeker: user._id, active: true });
    if (active >= MAX_ACTIVE_PLANS) return res.status(409).json({ error: `You can have up to ${MAX_ACTIVE_PLANS} active repeating requests. Pause or delete one first.` });

    const plan = await RecurringPlan.create({
      seeker: user._id,
      familyMemberId: familyMemberId || null,
      patientName,
      bloodGroup,
      component,
      units: u,
      hospital: String(hospital).trim(),
      area: String(area).trim(),
      location: { type: "Point", coordinates: [Number(lng), Number(lat)] },
      notes: notes ? String(notes).slice(0, 300) : undefined,
      everyWeeks: weeks,
      nextNeededAt: first,
    });
    res.status(201).json({ plan: serializePlan(plan) });
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Failed to save the repeating request" });
  }
});

// Pause / resume, or skip the next occurrence.
router.patch("/:id", verifyToken, async (req, res) => {
  try {
    const user = await currentSeeker(req, res);
    if (!user) return;
    if (!isId(req.params.id)) return res.status(404).json({ error: "Repeating request not found" });
    const plan = await RecurringPlan.findOne({ _id: req.params.id, seeker: user._id });
    if (!plan) return res.status(404).json({ error: "Repeating request not found" });

    if (typeof req.body.active === "boolean") {
      if (req.body.active && !plan.active) {
        const active = await RecurringPlan.countDocuments({ seeker: user._id, active: true });
        if (active >= MAX_ACTIVE_PLANS) return res.status(409).json({ error: `You can have up to ${MAX_ACTIVE_PLANS} active repeating requests.` });
        // Resuming: if the stored date has passed, move forward to the next future occurrence.
        const step = plan.everyWeeks * 7 * 24 * 3600e3;
        while (plan.nextNeededAt.getTime() <= Date.now()) plan.nextNeededAt = new Date(plan.nextNeededAt.getTime() + step);
      }
      plan.active = req.body.active;
    }
    if (req.body.skipNext === true) {
      plan.nextNeededAt = new Date(plan.nextNeededAt.getTime() + plan.everyWeeks * 7 * 24 * 3600e3);
    }
    await plan.save();
    res.json({ plan: serializePlan(plan) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update the repeating request" });
  }
});

router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const user = await currentSeeker(req, res);
    if (!user) return;
    if (!isId(req.params.id)) return res.status(404).json({ error: "Repeating request not found" });
    const plan = await RecurringPlan.findOne({ _id: req.params.id, seeker: user._id });
    if (!plan) return res.status(404).json({ error: "Repeating request not found" });
    await plan.deleteOne();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete the repeating request" });
  }
});

module.exports = router;
module.exports.serializePlan = serializePlan;
