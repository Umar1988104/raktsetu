// A request's "journey" for its owner: only things that really happened, with
// the real time each one happened. Built from stored data — nothing invented.
// Types: created, scheduled, released, hospital-verified, notified, escalated,
// accepted, extended, fulfilled, expired.
const idTime = (id) => {
  try {
    return id && id.getTimestamp ? id.getTimestamp() : null; // ObjectId carries its creation time
  } catch {
    return null;
  }
};
const when = (d) => (d ? new Date(d) : null);

function buildTimeline(r) {
  const events = [];
  const add = (type, at, detail) => {
    const date = when(at);
    if (date && !Number.isNaN(date.getTime())) events.push({ type, at: date, ...(detail ? { detail } : {}) });
  };

  add("created", r.createdAt);
  if (r.neededBy && r.released === false) add("scheduled", r.createdAt, "Waiting until closer to the date");

  // Stored milestones (v2.0): escalations, hospital verification, extensions, release.
  for (const e of r.timeline || []) add(e.type, e.at, e.detail);

  // Donors notified: group the first batch (everyone contacted at about the same time).
  const contacted = (r.contactedDonors || [])
    .map((c) => ({ at: when(c.notifiedAt) || idTime(c._id), responded: when(c.respondedAt), status: c.status }))
    .filter((c) => c.at);
  const escalations = (r.timeline || []).filter((e) => e.type === "escalated").map((e) => when(e.at).getTime());
  const first = contacted.filter((c) => !escalations.some((t) => Math.abs(c.at.getTime() - t) < 60e3));
  if (first.length) add("notified", new Date(Math.min(...first.map((c) => c.at.getTime()))), `${first.length} donor${first.length === 1 ? "" : "s"} notified`);

  const accepted = contacted.filter((c) => c.status === "Accepted" && c.responded);
  accepted.forEach((c, i) => add("accepted", c.responded, accepted.length > 1 ? `Donor ${i + 1} accepted` : undefined));

  if (r.status === "Fulfilled") add("fulfilled", r.closedAt);
  if (r.status === "Expired") add("expired", r.closedAt, r.closedReason || undefined);

  return events.sort((a, b) => a.at - b.at);
}

module.exports = { buildTimeline };
