// Minimum gap between whole-blood donations, per Indian guidance as published
// by hospitals following NBTC norms: eligible men every 3 months, eligible
// women every 4 months. If we don't know (donor left it blank), we use the
// LONGER gap — a missing answer must never make someone eligible too early.
const GAP_DAYS = { male: 90, female: 120 };
const DEFAULT_GAP_DAYS = 120;

function gapDaysFor(donor) {
  return GAP_DAYS[donor.sex] || DEFAULT_GAP_DAYS;
}

// Returns null if the donor is eligible to donate right now, or the Date
// they become eligible again if not (based on their most recent logged
// donation — not just whatever `available` currently says).
function getNextEligibleDate(donor) {
  const history = donor.donationHistory || [];
  if (history.length === 0) return null;

  const mostRecent = history.reduce((latest, h) => (h.date > latest ? h.date : latest), history[0].date);
  const nextEligible = new Date(mostRecent);
  nextEligible.setDate(nextEligible.getDate() + gapDaysFor(donor));

  return nextEligible > new Date() ? nextEligible : null;
}

module.exports = { getNextEligibleDate, gapDaysFor, GAP_DAYS, DEFAULT_GAP_DAYS };
