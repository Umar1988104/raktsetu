const express = require("express");
const User = require("../models/User");
const Donor = require("../models/Donor");
const Card = require("../models/Card");
const verifyToken = require("../middleware/verifyToken");
const { generateCardId, normalizeCardId } = require("../utils/cardId");
const { createLimiter } = require("../utils/rateLimit");
const { buildCardView } = require("../utils/cardView");
const { serializeOwnCard, serializePublicCard, serializeDonor } = require("../utils/serializers");
const { PHONE_REGEX } = require("../models/User");

const router = express.Router();

const USER_FIELDS = "name phone email familyMembers photo address alternatePhone role hospitalName partnerVerified isGuest createdAt";
const SHOW_KEYS = ["name", "bloodGroup", "tier", "verified", "memberSince", "eligibleToday"];

// Public lookups are rate limited per IP: a general cap, plus a much lower cap
// on lookups that miss (someone guessing IDs). In-memory; resets on restart.
const publicLimiter = createLimiter({ windowMs: 60e3, max: 40 });
const missLimiter = createLimiter({ windowMs: 10 * 60e3, max: 8 });
const hospitalLimiter = createLimiter({ windowMs: 60e3, max: 30 });
const clientIp = (req) => req.ip || req.socket?.remoteAddress || "unknown";

// Creates any cards this account is missing: one for the account holder, one
// per family member, and a partner card for hospital accounts. Guests get none.
async function ensureCards(user) {
  const wanted = [];
  if (user.role === "hospital") wanted.push({ kind: "partner", familyMemberId: null });
  else wanted.push({ kind: "member", familyMemberId: null });
  if (user.role !== "hospital") {
    for (const fm of user.familyMembers || []) wanted.push({ kind: "member", familyMemberId: fm._id });
  }

  const existing = await Card.find({ owner: user._id });
  const have = new Set((existing || []).map((c) => `${c.kind}:${c.familyMemberId || ""}`));
  const created = [];
  for (const w of wanted) {
    if (have.has(`${w.kind}:${w.familyMemberId || ""}`)) continue;
    const isFamily = !!w.familyMemberId;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const card = await Card.create({
          cardId: generateCardId(),
          owner: user._id,
          familyMemberId: w.familyMemberId,
          kind: w.kind,
          // A family member may be a child or a patient: their name stays off
          // the public page unless the owner turns it on.
          show: isFamily ? { name: false } : undefined,
        });
        created.push(card);
        break;
      } catch (err) {
        if (err && err.code === 11000 && attempt < 4) continue; // ID collision or concurrent create: retry
        if (err && err.code === 11000) break;
        throw err;
      }
    }
  }
  return [...(existing || []), ...created];
}

const cardOrder = (cards) =>
  [...cards].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "partner" ? -1 : 1) || (a.familyMemberId ? 1 : 0) - (b.familyMemberId ? 1 : 0));

// The signed-in user's cards (household stack).
router.get("/mine", verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ error: "No RaktSetu profile yet" });
    if (user.isGuest) return res.json({ guest: true, cards: [] });

    const cards = await ensureCards(user);
    const donors = user.role === "hospital" ? [] : await Donor.find({ user: user._id });
    res.json({
      guest: false,
      cards: cardOrder(cards).map((c) => serializeOwnCard(buildCardView(c, user, donors))),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load your card" });
  }
});

// Finds a card belonging to the signed-in user, by its ID.
async function ownCard(req) {
  const id = normalizeCardId(req.params.cardId);
  if (!id) return { error: [404, "Card not found"] };
  const user = await User.findOne({ firebaseUid: req.user.uid });
  if (!user) return { error: [404, "No RaktSetu profile yet"] };
  const card = await Card.findOne({ cardId: id, owner: user._id });
  if (!card) return { error: [404, "Card not found"] };
  return { user, card };
}

// Owner-controlled settings: visibility, which fields the public page may
// show, and the optional emergency contact. Unknown keys are ignored.
router.patch("/:cardId/settings", verifyToken, async (req, res) => {
  try {
    const found = await ownCard(req);
    if (found.error) return res.status(found.error[0]).json({ error: found.error[1] });
    const { user, card } = found;
    const body = req.body || {};

    if (typeof body.hidden === "boolean") card.hidden = body.hidden;

    if (body.show && typeof body.show === "object" && card.kind === "member") {
      card.show = card.show || {};
      for (const k of SHOW_KEYS) if (typeof body.show[k] === "boolean") card.show[k] = body.show[k];
    }

    if (body.emergencyContact && typeof body.emergencyContact === "object" && card.kind === "member") {
      const ec = body.emergencyContact;
      const next = { ...(card.emergencyContact?.toObject ? card.emergencyContact.toObject() : card.emergencyContact || {}) };
      if (typeof ec.name === "string") next.name = ec.name.trim().slice(0, 60);
      if (typeof ec.phone === "string") {
        const phone = ec.phone.replace(/\D/g, "");
        if (phone && !PHONE_REGEX.test(phone)) return res.status(400).json({ error: "Emergency contact phone must be a 10-digit Indian mobile number" });
        next.phone = phone;
      }
      if (typeof ec.enabled === "boolean") next.enabled = ec.enabled;
      if (next.enabled && (!next.name || !next.phone)) {
        return res.status(400).json({ error: "Add a name and phone number for the emergency contact first" });
      }
      card.emergencyContact = next;
    }

    await card.save();
    const donors = user.role === "hospital" ? [] : await Donor.find({ user: user._id });
    res.json({ card: serializeOwnCard(buildCardView(card, user, donors)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update card settings" });
  }
});

// New random ID (and so a new QR). The old ID stops working immediately.
router.post("/:cardId/regenerate", verifyToken, async (req, res) => {
  try {
    const found = await ownCard(req);
    if (found.error) return res.status(found.error[0]).json({ error: found.error[1] });
    const { user, card } = found;

    let saved = false;
    for (let attempt = 0; attempt < 5 && !saved; attempt++) {
      card.cardId = generateCardId();
      card.regeneratedAt = new Date();
      try {
        await card.save();
        saved = true;
      } catch (err) {
        if (!(err && err.code === 11000)) throw err;
      }
    }
    if (!saved) return res.status(500).json({ error: "Couldn't create a new card ID — please try again" });

    const donors = user.role === "hospital" ? [] : await Donor.find({ user: user._id });
    res.json({ card: serializeOwnCard(buildCardView(card, user, donors)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to regenerate card" });
  }
});

// Public verify page data (what the QR code opens). No login. Hidden cards,
// unknown IDs and malformed IDs all look identical: 404 "Card not found".
router.get("/public/:cardId", async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.set("X-Robots-Tag", "noindex, nofollow");
  try {
    const ip = clientIp(req);
    if (missLimiter.peek(ip)) return res.status(429).set("Retry-After", "600").json({ error: "Too many lookups. Please wait a few minutes and try again." });
    const gen = publicLimiter.hit(ip);
    if (!gen.allowed) return res.status(429).set("Retry-After", String(gen.retryAfterSec)).json({ error: "Too many requests. Please slow down." });

    const notFound = () => {
      missLimiter.hit(ip);
      return res.status(404).json({ error: "Card not found" });
    };

    const id = normalizeCardId(req.params.cardId);
    if (!id) return notFound(); // typo or junk: don't even query the database
    const card = await Card.findOne({ cardId: id });
    if (!card || card.hidden) return notFound();

    const user = await User.findById(card.owner).select(USER_FIELDS);
    if (!user) return notFound();
    const donors = card.kind === "member" ? await Donor.find({ user: user._id }) : [];
    res.json({ card: serializePublicCard(buildCardView(card, user, donors)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load card" });
  }
});

// Hospital partner: look a donor up by card ID (more private than searching
// by phone). Same response shape as /donors/search so the screen can reuse it.
router.get("/lookup/:cardId", verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user || user.role !== "hospital") return res.status(403).json({ error: "Only hospital accounts can look up cards" });

    const gen = hospitalLimiter.hit(req.user.uid);
    if (!gen.allowed) return res.status(429).set("Retry-After", String(gen.retryAfterSec)).json({ error: "Too many lookups. Please wait a moment." });

    const id = normalizeCardId(req.params.cardId);
    if (!id) return res.status(404).json({ error: "Card not found" });
    const card = await Card.findOne({ cardId: id, kind: "member" });
    if (!card || card.hidden) return res.status(404).json({ error: "Card not found" });

    const donorQuery = { user: card.owner, familyMemberId: card.familyMemberId || null };
    const donor = await Donor.findOne(donorQuery).populate("user", "name phone email familyMembers photo address alternatePhone");
    if (!donor) return res.status(404).json({ error: "This card's owner has no donor profile to verify" });
    res.json({ donors: [serializeDonor(donor, "hospital")] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to look up card" });
  }
});

module.exports = router;
module.exports._limiters = { publicLimiter, missLimiter, hospitalLimiter }; // for tests
