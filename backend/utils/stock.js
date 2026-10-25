// Blood stock board rules (v2.1). Pure helpers so they are easy to test.
const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const STALE_HOURS = 48;
const LOW_MAX = 4; // 1–4 units is shown as "Low"

const DISCLAIMER =
  "Hand-updated by the hospital's blood bank, so it can be out of date. Stock changes quickly — please call the blood bank to confirm before you travel.";

// Accepts { "A+": 12, ... } with ALL eight groups, whole numbers 0–999.
function parseLevels(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "Send the units for all 8 blood groups" };
  const extra = Object.keys(input).filter((k) => !GROUPS.includes(k));
  if (extra.length) return { error: `Unknown blood group: ${extra[0].slice(0, 10)}` };
  const levels = [];
  for (const g of GROUPS) {
    const raw = input[g];
    const ok = (typeof raw === "number" && Number.isInteger(raw)) || (typeof raw === "string" && /^\d{1,3}$/.test(raw.trim()));
    const n = ok ? Number(raw) : NaN;
    if (!Number.isInteger(n) || n < 0 || n > 999) return { error: `Units for ${g} must be a whole number from 0 to 999` };
    levels.push({ group: g, units: n });
  }
  return { levels };
}

function levelWord(units) {
  if (units <= 0) return "None";
  if (units <= LOW_MAX) return "Low";
  return "Available";
}

function hoursSince(date, now = new Date()) {
  const ms = now.getTime() - new Date(date).getTime();
  return Math.max(0, Math.floor(ms / 3600e3));
}

// Public shape: nothing that identifies a person or account.
function serializeStock(doc, now = new Date()) {
  const hours = hoursSince(doc.stockUpdatedAt, now);
  return {
    id: String(doc._id),
    hospitalName: doc.hospitalName,
    address: doc.address,
    area: doc.area,
    location: doc.location?.coordinates ? { lng: doc.location.coordinates[0], lat: doc.location.coordinates[1] } : null,
    levels: GROUPS.map((g) => {
      const found = (doc.levels || []).find((l) => l.group === g);
      const units = found ? found.units : 0;
      return { group: g, units, level: levelWord(units) };
    }),
    updatedAt: new Date(doc.stockUpdatedAt).toISOString(),
    hoursAgo: hours,
    stale: hours >= STALE_HOURS,
  };
}

module.exports = { GROUPS, STALE_HOURS, LOW_MAX, DISCLAIMER, parseLevels, levelWord, hoursSince, serializeStock };
