const COOLDOWN_DAYS = 90; // standard minimum gap between whole-blood donations

// Returns null if the donor is eligible to donate right now, or the Date
// they become eligible again if not (based on their most recent logged
// donation — not just whatever `available` currently says).
function getNextEligibleDate(donor) {
  const history = donor.donationHistory || [];
  if (history.length === 0) return null;

  const mostRecent = history.reduce((latest, h) => (h.date > latest ? h.date : latest), history[0].date);
  const nextEligible = new Date(mostRecent);
  nextEligible.setDate(nextEligible.getDate() + COOLDOWN_DAYS);

  return nextEligible > new Date() ? nextEligible : null;
}

module.exports = { getNextEligibleDate, COOLDOWN_DAYS };
