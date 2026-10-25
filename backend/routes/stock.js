const express = require("express");
const User = require("../models/User");
const BloodStock = require("../models/BloodStock");
const verifyToken = require("../middleware/verifyToken");
const { hospitalGate, send } = require("../middleware/gates");
const { escapeRegex } = require("../utils/text");
const { GROUPS, DISCLAIMER, parseLevels, serializeStock } = require("../utils/stock");

const router = express.Router();
const getUser = (req) => User.findOne({ firebaseUid: req.user.uid });

const cleanText = (v, max) => String(v ?? "").trim().slice(0, max);
const validCoords = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

// Public: anyone can see the boards (no account needed — an emergency shouldn't
// need a login). Optional ?bloodGroup=O- (only boards with at least 1 unit) and ?area=.
router.get("/", async (req, res) => {
  try {
    const filter = {};
    const group = String(req.query.bloodGroup || "");
    if (group) {
      if (!GROUPS.includes(group)) return res.status(400).json({ error: "Unknown blood group" });
      filter.levels = { $elemMatch: { group, units: { $gt: 0 } } };
    }
    const area = cleanText(req.query.area, 60);
    if (area) filter.area = { $regex: escapeRegex(area), $options: "i" };
    const boards = await BloodStock.find(filter).sort({ stockUpdatedAt: -1 }).limit(100);
    res.json({ boards: boards.map((b) => serializeStock(b)), disclaimer: DISCLAIMER });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load blood stock" });
  }
});

// The hospital's own board (for the update form).
router.get("/mine", verifyToken, async (req, res) => {
  try {
    const user = await getUser(req);
    if (!user || user.role !== "hospital") return res.status(403).json({ error: "Only hospital accounts have a stock board" });
    const board = await BloodStock.findOne({ hospital: user._id });
    res.json({ board: board ? serializeStock(board) : null, disclaimer: DISCLAIMER });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load your stock board" });
  }
});

// Create or update the board. Approved hospital partners only. The first time,
// address + area + coordinates are required (so people can find the blood bank).
router.put("/mine", verifyToken, async (req, res) => {
  try {
    const user = await getUser(req);
    const block = hospitalGate(req, user);
    if (block) return send(res, block);

    const parsed = parseLevels(req.body?.levels);
    if (parsed.error) return res.status(400).json({ error: parsed.error });

    let board = await BloodStock.findOne({ hospital: user._id });
    const address = req.body?.address !== undefined ? cleanText(req.body.address, 200) : board?.address;
    const area = req.body?.area !== undefined ? cleanText(req.body.area, 100) : board?.area;
    if (!address || !area) return res.status(400).json({ error: "Address and area are required" });

    let coordinates = board?.location?.coordinates;
    if (req.body?.lat !== undefined || req.body?.lng !== undefined || !coordinates) {
      const lat = Number(req.body?.lat);
      const lng = Number(req.body?.lng);
      if (!validCoords(lat, lng)) return res.status(400).json({ error: "Please give the blood bank's location (latitude and longitude)" });
      coordinates = [lng, lat];
    }

    const now = new Date();
    if (!board) board = new BloodStock({ hospital: user._id });
    board.hospitalName = user.hospitalName;
    board.address = address;
    board.area = area;
    board.location = { type: "Point", coordinates };
    board.levels = parsed.levels;
    board.stockUpdatedAt = now;
    await board.save();
    res.json({ board: serializeStock(board, now), disclaimer: DISCLAIMER });
  } catch (err) {
    if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: "Failed to save the stock board" });
  }
});

router.delete("/mine", verifyToken, async (req, res) => {
  try {
    const user = await getUser(req);
    const block = hospitalGate(req, user);
    if (block) return send(res, block);
    await BloodStock.deleteOne({ hospital: user._id });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove the stock board" });
  }
});

module.exports = router;
