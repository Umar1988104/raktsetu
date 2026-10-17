import QRCode from "qrcode";

// Everything the card needs that isn't drawing: links, QR codes, labels.
export const verifyUrl = (cardId) => `${window.location.origin}/card/${cardId}`;

export async function makeQr(cardId, width = 360) {
  return QRCode.toDataURL(verifyUrl(cardId), {
    margin: 1,
    width,
    errorCorrectionLevel: "M",
    color: { dark: "#0B1F2A", light: "#FFFFFF" },
  });
}

export const TIER_LABEL = { New: "New member", Trusted: "Trusted", Pillar: "Pillar" };

export function memberSinceLabel(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export function shortDate(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
}

export const STAMP_SLOTS = 8;

// What the public verify page will show for the current settings — the same
// rules the server applies, written out so the owner can see them.
export function publicPreview(card) {
  if (card.kind === "partner") return [card.hospitalName, card.partnerVerified ? "Verified Partner" : "Pending verification"];
  const s = card.settings.show;
  const out = [];
  if (s.name) out.push(card.shortName);
  if (s.bloodGroup && card.bloodGroup) out.push(card.bloodGroup);
  if (s.tier) out.push(card.tier);
  if (s.verified) out.push(card.verified ? "Verified" : "Not yet verified");
  if (s.memberSince && card.memberSince) out.push(`Member since ${new Date(card.memberSince).getFullYear()}`);
  if (s.eligibleToday && card.eligibleToday !== null) out.push(card.eligibleToday ? "Eligible to donate today" : "Not eligible today");
  return out;
}
