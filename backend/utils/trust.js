// Trust tier for a donor profile, computed from real signals rather than a
// raw gameable number. Shown as a badge: New / Trusted / Pillar.
function computeTrustScore(donor, user) {
  let score = 0;
  if (donor.verified) score += 40; // hospital-verified — the strongest signal
  score += Math.min(donor.donationHistory?.length || 0, 3) * 10; // up to 3 fulfilled donations
  if (user?.photo) score += 10;
  if (user?.address) score += 10;
  if (user?.alternatePhone) score += 10;
  return score;
}

function tierForScore(score) {
  if (score >= 60) return "Pillar";
  if (score >= 20) return "Trusted";
  return "New";
}

function computeTrustTier(donor, user) {
  return tierForScore(computeTrustScore(donor, user));
}

module.exports = { computeTrustScore, computeTrustTier };
