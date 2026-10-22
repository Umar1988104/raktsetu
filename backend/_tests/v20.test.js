const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const express = require("express");

const Request = require("../models/Request");
const Donor = require("../models/Donor");
const { buildTimeline } = require("../utils/timeline");
const { buildHeatCells, MIN_PER_CELL } = require("../utils/heatmap");
const { serializeRequestForOwner } = require("../utils/serializers");

const T = (iso) => new Date(iso);
const base = { createdAt: T("2026-10-20T08:00:00Z"), status: "Contacted", contactedDonors: [], timeline: [] };

// ---------------- request journey ----------------
test("timeline: a brand-new request has only 'created' — nothing invented", () => {
  const t = buildTimeline(base);
  assert.deepEqual(t.map((e) => e.type), ["created"]);
});

test("timeline: created → notified → escalated → accepted → fulfilled, in order, with real times", () => {
  const r = {
    ...base,
    status: "Fulfilled",
    closedAt: T("2026-10-20T14:00:00Z"),
    contactedDonors: [
      { notifiedAt: T("2026-10-20T08:00:05Z"), status: "Pending" },
      { notifiedAt: T("2026-10-20T08:00:05Z"), status: "Declined", respondedAt: T("2026-10-20T08:20:00Z") },
      { notifiedAt: T("2026-10-20T09:00:02Z"), status: "Accepted", respondedAt: T("2026-10-20T09:30:00Z") },
    ],
    timeline: [{ type: "escalated", at: T("2026-10-20T09:00:00Z"), detail: "1 more donor notified" }],
  };
  const t = buildTimeline(r);
  assert.deepEqual(t.map((e) => e.type), ["created", "notified", "escalated", "accepted", "fulfilled"]);
  assert.equal(t[1].detail, "2 donors notified", "escalation batch is not counted in the first notification");
  assert.equal(t[3].at.toISOString(), "2026-10-20T09:30:00.000Z");
  for (let i = 1; i < t.length; i++) assert.ok(t[i].at >= t[i - 1].at, "sorted by time");
});

test("timeline: older entries without notifiedAt fall back to the id's creation time", () => {
  const id = new mongoose.Types.ObjectId(Math.floor(T("2026-10-20T08:05:00Z").getTime() / 1000));
  const t = buildTimeline({ ...base, contactedDonors: [{ _id: id, status: "Pending" }] });
  const n = t.find((e) => e.type === "notified");
  assert.ok(n && n.at.toISOString().startsWith("2026-10-20T08:05"));
});

test("timeline: planned, hospital-verified, extended, expired", () => {
  const planned = buildTimeline({ ...base, released: false, neededBy: T("2026-10-30T08:00:00Z") });
  assert.ok(planned.some((e) => e.type === "scheduled"));
  const crit = buildTimeline({ ...base, timeline: [{ type: "hospital-verified", at: T("2026-10-20T08:10:00Z") }, { type: "extended", at: T("2026-10-21T08:00:00Z") }] });
  assert.deepEqual(crit.map((e) => e.type), ["created", "hospital-verified", "extended"]);
  const expired = buildTimeline({ ...base, status: "Expired", closedAt: T("2026-10-22T08:00:00Z"), closedReason: "Timed out" });
  assert.equal(expired.at(-1).type, "expired");
  assert.equal(expired.at(-1).detail, "Timed out");
});

test("owner's request view includes the timeline", () => {
  const out = serializeRequestForOwner({ _id: "r", ...base, bloodGroup: "A+", units: 1, urgency: "Normal", hospital: "H", area: "A" });
  assert.ok(Array.isArray(out.timeline) && out.timeline[0].type === "created");
});

// ---------------- heatmap ----------------
const at = (lat, lng) => ({ location: { coordinates: [lng, lat] } });

test("heatmap: cells under the minimum are never returned; counts are snapped to the grid", () => {
  const reqs = [
    ...Array.from({ length: 6 }, (_, i) => at(28.61 + i * 0.001, 77.21)), // 6 in one cell
    ...Array.from({ length: 4 }, () => at(19.07, 72.87)), // 4 elsewhere: hidden
  ];
  const { cells, hiddenCells } = buildHeatCells(reqs);
  assert.equal(cells.length, 1);
  assert.equal(cells[0].count, 6);
  assert.equal(hiddenCells, 1);
  // snapped to a cell centre: never an exact request position
  assert.ok(!reqs.some((r) => r.location.coordinates[1] === cells[0].lat && r.location.coordinates[0] === cells[0].lng));
  assert.deepEqual(Object.keys(cells[0]).sort(), ["count", "lat", "lng"]);
});

test("heatmap: bad coordinates are ignored; exactly the minimum is shown", () => {
  const reqs = [{ location: {} }, {}, { location: { coordinates: ["x", "y"] } }, ...Array.from({ length: MIN_PER_CELL }, () => at(12.97, 77.59))];
  const { cells } = buildHeatCells(reqs);
  assert.equal(cells.length, 1);
  assert.equal(cells[0].count, MIN_PER_CELL);
});

test("GET /stats/heatmap: public, aggregate only (no ids, hospitals, exact positions)", async () => {
  const q = (result) => { const o = { select: () => o, limit: () => o, lean: () => o, then: (a, b) => Promise.resolve(result).then(a, b) }; return o; };
  Request.find = () => q(Array.from({ length: 7 }, (_, i) => ({ _id: "SECRET_ID", hospital: "SECRET_HOSPITAL", location: { coordinates: [77.2 + i * 0.0001, 28.6] } })));
  Request.exists = async () => null;
  Donor.exists = async () => null;
  const app = express();
  app.use("/api/stats", require("../routes/stats"));
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  try {
    const res = await fetch(`http://localhost:${server.address().port}/api/stats/heatmap`);
    const text = await res.text();
    assert.equal(res.status, 200);
    const json = JSON.parse(text);
    assert.equal(json.cells.length, 1);
    assert.equal(json.cells[0].count, 7);
    assert.equal(json.minPerCell, 5);
    assert.ok(!text.includes("SECRET_ID") && !text.includes("SECRET_HOSPITAL"));
    assert.ok(!text.includes("77.2001") && !text.includes("28.6,"), "exact position leaked");
  } finally {
    server.close();
  }
});

// ---------------- public trust claims ----------------
test("public stats only count admin-approved hospitals as partners", async () => {
  const User = require("../models/User");
  const filters = [];
  const q = (result) => { const o = { select: () => o, sort: () => o, limit: () => o, lean: () => o, then: (a, b) => Promise.resolve(result).then(a, b) }; return o; };
  Donor.countDocuments = async () => 0;
  Donor.aggregate = async () => [];
  Request.countDocuments = async () => 0;
  User.find = (f) => { filters.push(f); return q([{ hospitalName: "Approved Hospital" }]); };
  Request.exists = async () => null;
  Donor.exists = async () => null;
  const app = express();
  app.use("/api/stats", require("../routes/stats"));
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  try {
    const res = await fetch(`http://localhost:${server.address().port}/api/stats`);
    assert.equal(res.status, 200);
    const hospitalFilter = filters.find((f) => f && f.role === "hospital");
    assert.equal(hospitalFilter.partnerVerified, true, "must filter on partnerVerified");
  } finally {
    server.close();
  }
});
