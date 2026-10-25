// Referral links (v2.1): /signup?ref=CODE. We remember the code in this browser
// until the person finishes creating a donor profile, then forget it. Codes are
// random strings; the app never shows who invited whom.
const KEY = "rs_ref";
const CODE_RE = /^[2-9A-HJ-NP-Z]{8}$/;

export function cleanReferralCode(raw) {
  const s = String(raw ?? "").toUpperCase().replace(/[\s-]/g, "");
  return CODE_RE.test(s) ? s : null;
}

// Call once at start-up: if the address has ?ref=..., keep it.
export function captureReferral() {
  try {
    const code = cleanReferralCode(new URLSearchParams(window.location.search).get("ref"));
    if (code) localStorage.setItem(KEY, code);
  } catch {
    /* storage can be blocked — the invite simply won't be remembered */
  }
}

export function getPendingReferral() {
  try {
    return cleanReferralCode(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function clearPendingReferral() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export const buildInviteLink = (code) => `${window.location.origin}/signup?ref=${code}`;
