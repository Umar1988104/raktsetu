// Request "heatmap" cells for the public Impact page (v2.0). Aggregate only:
// requests are bucketed into ~11 km grid cells (0.1 degree) and a cell is only
// shown if it holds at least MIN_PER_CELL requests, so no single request or
// person can be picked out. No ids, no hospitals, no exact positions.
const CELL_DEG = 0.1;
const MIN_PER_CELL = 5;
const WINDOW_DAYS = 90;

const snap = (v) => Math.floor(v / CELL_DEG) * CELL_DEG;
const round = (v) => Math.round(v * 100) / 100; // clean .1 steps, no float noise

// requests: [{ location: { coordinates: [lng, lat] } }]
function buildHeatCells(requests, { minPerCell = MIN_PER_CELL } = {}) {
  const cells = new Map();
  for (const r of requests) {
    const c = r.location && r.location.coordinates;
    if (!c || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
    const lat = round(snap(c[1]));
    const lng = round(snap(c[0]));
    const key = `${lat},${lng}`;
    cells.set(key, (cells.get(key) || 0) + 1);
  }
  const shown = [...cells.entries()]
    .filter(([, n]) => n >= minPerCell)
    .map(([key, n]) => {
      const [lat, lng] = key.split(",").map(Number);
      // cell centre, count
      return { lat: round(lat + CELL_DEG / 2), lng: round(lng + CELL_DEG / 2), count: n };
    })
    .sort((a, b) => b.count - a.count);
  return { cells: shown, hiddenCells: cells.size - shown.length };
}

module.exports = { buildHeatCells, CELL_DEG, MIN_PER_CELL, WINDOW_DAYS };
