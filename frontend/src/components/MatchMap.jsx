import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { clusterPoints, BANDS, bandFor } from "../utils/cluster";

const pin = (bg, label, size = 26) =>
  L.divIcon({
    html: `<div style="background:${bg};color:#fff;width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.35);">${label}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

// Zooms the map to fit the search circle once, when it first appears.
function FitCircle({ center, radiusM }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(L.latLng(center).toBounds(radiusM * 2), { padding: [24, 24] }); // bounds of the circle, no map needed yet
  }, [map, center[0], center[1], radiusM]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// Donor pins, merged into numbered bubbles when they'd overlap at this zoom.
function Pins({ points }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const clusters = useMemo(() => clusterPoints(points, zoom), [points, zoom]);

  return clusters.map((c) => {
    if (c.members.length === 1) {
      const m = c.members[0];
      return (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={pin(bandFor(m.distanceKm).color, m.n)}>
          <Popup>{m.label}</Popup>
        </Marker>
      );
    }
    const nearest = Math.min(...c.members.map((m) => m.distanceKm));
    return (
      <Marker
        key={c.members.map((m) => m.id).join("-")}
        position={[c.lat, c.lng]}
        icon={pin(bandFor(nearest).color, `${c.members.length}`, 34)}
        eventHandlers={{ click: () => map.fitBounds(L.latLngBounds(c.members.map((m) => [m.lat, m.lng])), { padding: [40, 40], maxZoom: 15 }) }}
      >
        <Popup>{c.members.length} donors close together — tap to zoom in</Popup>
      </Marker>
    );
  });
}

// The seeker's map (v2.0): the request, a search-radius circle, donor pins
// coloured by distance, and clustered pins when donors overlap.
export default function MatchMap({ request, matches, requestIcon }) {
  const center = [request.coordinates[1], request.coordinates[0]];
  const radiusKm = Math.max(1, Math.ceil(Math.max(...matches.map((m) => m.distanceKm || 0))));
  const points = useMemo(
    () =>
      matches.map((m, i) => ({
        id: m._id,
        n: i + 1,
        lat: m.coordinates[1],
        lng: m.coordinates[0],
        distanceKm: m.distanceKm || 0,
        label: `${m.donor?.name || "Donor"}${m.donor?.relation ? ` (${m.donor.relation})` : ""} · ${m.bloodGroup} · ${m.distanceKm} km`,
      })),
    [matches]
  );

  return (
    <>
      <div className="map-wrap">
        <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }}>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitCircle center={center} radiusM={radiusKm * 1000} />
          <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: "#0A84FF", weight: 2, dashArray: "6 6", fillColor: "#0A84FF", fillOpacity: 0.07 }} />
          <Marker position={center} icon={requestIcon}>
            <Popup>Your request location</Popup>
          </Marker>
          <Pins points={points} />
        </MapContainer>
      </div>
      <div className="map-legend" aria-label="Map key">
        <span className="legend-item"><span className="legend-ring" /> Donors listed are within {radiusKm} km</span>
        {BANDS.map((b) => (
          <span key={b.label} className="legend-item"><span className="legend-dot" style={{ background: b.color }} /> {b.label}</span>
        ))}
      </div>
    </>
  );
}
