import L from "leaflet";

// Groups map points that would sit on top of each other at the current zoom
// (v2.0). Pure grid clustering in screen pixels — no extra library.
// points: [{ lat, lng, ... }]  ->  [{ lat, lng, members: [point, ...] }]
export function clusterPoints(points, zoom, cellPx = 46) {
  const cells = new Map();
  for (const p of points) {
    const px = L.CRS.EPSG3857.latLngToPoint(L.latLng(p.lat, p.lng), zoom);
    const key = `${Math.floor(px.x / cellPx)}:${Math.floor(px.y / cellPx)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(p);
  }
  return [...cells.values()].map((members) => ({
    lat: members.reduce((s, m) => s + m.lat, 0) / members.length,
    lng: members.reduce((s, m) => s + m.lng, 0) / members.length,
    members,
  }));
}

// Distance bands used for colouring pins and the legend.
export const BANDS = [
  { max: 3, color: "#15803D", label: "Within 3 km" },
  { max: 8, color: "#1D4ED8", label: "3–8 km" },
  { max: Infinity, color: "#B45309", label: "Over 8 km" },
];
export const bandFor = (km) => BANDS.find((b) => km <= b.max) || BANDS[BANDS.length - 1];
