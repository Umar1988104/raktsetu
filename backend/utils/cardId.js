const crypto = require("crypto");

// Card IDs look like RS-7K4M-9QX2.
// - Alphabet leaves out 0/O and 1/I so an ID read aloud or off a screenshot
//   can't be mistyped (32 symbols: 2-9 and A-Z without I and O).
// - 7 random characters + 1 check character. The check character catches
//   typos before we even touch the database.
// - Purely random: NEVER derived from phone, email, name or database ids.
// - Treat an ID as a bearer secret: whoever has it can view the card's
//   public page (which shows only what the owner allows).
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const BODY_LEN = 7;

function checkChar(body) {
  let sum = 0;
  for (let i = 0; i < body.length; i++) sum += (ALPHABET.indexOf(body[i]) + 1) * (2 * i + 1); // odd weights: any single wrong character changes the sum
  return ALPHABET[sum % ALPHABET.length];
}

function generateCardId() {
  let body = "";
  for (let i = 0; i < BODY_LEN; i++) body += ALPHABET[crypto.randomInt(ALPHABET.length)];
  const full = body + checkChar(body);
  return `RS-${full.slice(0, 4)}-${full.slice(4)}`;
}

// Accepts "rs-7k4m-9qx2", "RS7K4M9QX2", " RS-7K4M-9QX2 " ... and returns the
// canonical form, or null if it can't possibly be a valid ID.
function normalizeCardId(input) {
  const raw = String(input || "").toUpperCase().replace(/[\s-]/g, "");
  if (!raw.startsWith("RS")) return null;
  const rest = raw.slice(2);
  if (rest.length !== BODY_LEN + 1) return null;
  for (const ch of rest) if (!ALPHABET.includes(ch)) return null;
  if (checkChar(rest.slice(0, BODY_LEN)) !== rest[BODY_LEN]) return null;
  return `RS-${rest.slice(0, 4)}-${rest.slice(4)}`;
}

module.exports = { generateCardId, normalizeCardId, ALPHABET };
