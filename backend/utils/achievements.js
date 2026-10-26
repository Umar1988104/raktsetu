// Opt-in badges and streaks (v2.1c). Pure rules, no database.
// Safety first: nothing here ever rewards donating EARLY. Badges count recorded
// donations only; the streak only measures "did you keep donating regularly",
// and the app copy says plainly: donate only when you are eligible.
const DAY = 86400e3;
const STREAK_MAX_GAP_DAYS = 183; // a donation within ~6 months of the previous one keeps the streak

const COUNT_BADGES = [
  { id: "first-drop", label: "First drop", at: 1 },
  { id: "regular", label: "Regular donor", at: 3 },
  { id: "committed", label: "Committed", at: 5 },
  { id: "ten-times", label: "Ten times over", at: 10 },
  { id: "legend", label: "Legend", at: 25 },
];
const BRIDGE_BUILDER = { id: "bridge-builder", label: "Bridge builder" }; // a friend you invited has donated

function sortedTimes(history) {
  return (history || [])
    .map((h) => new Date(h && h.date ? h.date : h).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
}

function computeStreak(times, now = new Date()) {
  if (!times.length) return { current: 0, best: 0 };
  let best = 1;
  let run = 1;
  for (let i = 1; i < times.length; i++) {
    run = (times[i] - times[i - 1]) / DAY <= STREAK_MAX_GAP_DAYS ? run + 1 : 1;
    if (run > best) best = run;
  }
  const alive = (now.getTime() - times[times.length - 1]) / DAY <= STREAK_MAX_GAP_DAYS;
  return { current: alive ? run : 0, best };
}

function computeAchievements({ donationHistory, referralCount } = {}, now = new Date()) {
  const times = sortedTimes(donationHistory);
  const total = times.length;
  const badges = COUNT_BADGES.filter((b) => total >= b.at).map(({ id, label }) => ({ id, label }));
  if ((Number(referralCount) || 0) >= 1) badges.push({ ...BRIDGE_BUILDER });
  const nextBadge = COUNT_BADGES.find((b) => b.at > total);
  return {
    total,
    firstDonation: total ? new Date(times[0]).toISOString() : null,
    lastDonation: total ? new Date(times[total - 1]).toISOString() : null,
    badges,
    next: nextBadge ? { id: nextBadge.id, label: nextBadge.label, needed: nextBadge.at - total } : null,
    streak: computeStreak(times, now),
  };
}

module.exports = { computeAchievements, computeStreak, COUNT_BADGES, STREAK_MAX_GAP_DAYS };
