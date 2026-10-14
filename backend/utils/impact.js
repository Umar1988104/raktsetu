// The success metrics from the project brief, computed from real data.
// Pure functions: give them records, get numbers back. Every figure comes with
// the size of the sample it's based on, so a result built from three requests
// can't pass for a trend.

const MIN = 60000;
const URGENT_WINDOW_MIN = 30;

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const toMinutes = (ms) => (ms === null ? null : Math.round((ms / MIN) * 10) / 10);

// requests: lean docs with createdAt, urgency, status, closedReason, reportedFake,
// contactedDonors[{status, respondedAt}].
function computeImpact(requests, now = new Date()) {
  const real = requests.filter((r) => !r.reportedFake);
  const removedAsFake = requests.length - real.length;

  const firstReply = [];
  const firstAccept = [];
  let urgentEligible = 0;
  let urgentAcceptedIn30 = 0;
  let fulfilled = 0;
  let expired = 0;
  let open = 0;
  const expiredBreakdown = {};

  for (const r of real) {
    const created = new Date(r.createdAt).getTime();
    const contacted = r.contactedDonors || [];
    const replies = contacted.filter((c) => c.respondedAt).map((c) => new Date(c.respondedAt).getTime() - created).filter((ms) => ms >= 0);
    const accepts = contacted
      .filter((c) => c.status === "Accepted" && c.respondedAt)
      .map((c) => new Date(c.respondedAt).getTime() - created)
      .filter((ms) => ms >= 0);

    if (replies.length) firstReply.push(Math.min(...replies));
    if (accepts.length) firstAccept.push(Math.min(...accepts));

    // Only judge urgent requests old enough to have had the full 30 minutes.
    if (["Urgent", "Critical"].includes(r.urgency) && now.getTime() - created >= URGENT_WINDOW_MIN * MIN) {
      urgentEligible += 1;
      if (accepts.length && Math.min(...accepts) <= URGENT_WINDOW_MIN * MIN) urgentAcceptedIn30 += 1;
    }

    if (r.status === "Fulfilled") fulfilled += 1;
    else if (r.status === "Expired") {
      expired += 1;
      const reason = r.closedReason || "Other";
      expiredBreakdown[reason] = (expiredBreakdown[reason] || 0) + 1;
    } else open += 1;
  }

  const closed = fulfilled + expired;
  return {
    totalRequests: real.length,
    removedAsFake,
    responseTime: {
      repliedSample: firstReply.length,
      avgFirstReplyMinutes: toMinutes(mean(firstReply)),
      medianFirstReplyMinutes: toMinutes(median(firstReply)),
      acceptedSample: firstAccept.length,
      avgFirstAcceptMinutes: toMinutes(mean(firstAccept)),
      medianFirstAcceptMinutes: toMinutes(median(firstAccept)),
    },
    urgentCoverage: {
      windowMinutes: URGENT_WINDOW_MIN,
      eligible: urgentEligible,
      acceptedWithinWindow: urgentAcceptedIn30,
      percent: urgentEligible ? Math.round((urgentAcceptedIn30 / urgentEligible) * 100) : null,
    },
    outcomes: {
      fulfilled,
      expired,
      open,
      closed,
      fulfilmentRate: closed ? Math.round((fulfilled / closed) * 100) : null,
      expiredBreakdown,
    },
  };
}

// donors: lean docs with area, available, verified. Groups by area (ignoring
// capitalisation and extra spaces) and returns the busiest few.
function computeAreaStats(donors, limit = 8) {
  const groups = new Map();
  for (const d of donors) {
    const clean = String(d.area || "").trim().replace(/\s+/g, " ");
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (!groups.has(key)) groups.set(key, { area: clean, total: 0, available: 0, verified: 0 });
    const g = groups.get(key);
    g.total += 1;
    if (d.available) g.available += 1;
    if (d.verified) g.verified += 1;
  }
  return [...groups.values()].sort((a, b) => b.total - a.total || a.area.localeCompare(b.area)).slice(0, limit);
}

module.exports = { computeImpact, computeAreaStats };
