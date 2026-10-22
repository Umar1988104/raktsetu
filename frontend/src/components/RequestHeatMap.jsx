import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api";
import Skeleton from "./Skeleton";
import EmptyState from "./EmptyState";

function FitCells({ cells }) {
  const map = useMap();
  useEffect(() => {
    if (cells.length) map.fitBounds(L.latLngBounds(cells.map((c) => [c.lat, c.lng])).pad(0.6), { maxZoom: 11 });
  }, [map, cells]);
  return null;
}

// Where blood was requested recently (v2.0). Aggregate only: ~11 km areas, and
// an area appears only once it holds at least `minPerCell` requests.
export default function RequestHeatMap() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/api/stats/heatmap").then(setData).catch(() => setData({ cells: [], minPerCell: 5, windowDays: 90, cellKm: 11, hiddenCells: 0, failed: true }));
  }, []);

  return (
    <div className="card">
      <h3>Where blood is being requested</h3>
      {!data ? (
        <Skeleton rows={2} />
      ) : data.cells.length === 0 ? (
        <EmptyState art="search" title="Not enough requests yet to show a map." compact>
          <p className="status">To protect privacy, an area appears only when it has at least {data.minPerCell} requests in {data.windowDays} days.</p>
        </EmptyState>
      ) : (
        <>
          <div className="map-wrap">
            <MapContainer center={[data.cells[0].lat, data.cells[0].lng]} zoom={8} style={{ height: "100%", width: "100%" }}>
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FitCells cells={data.cells} />
              {data.cells.map((c) => (
                <CircleMarker key={`${c.lat},${c.lng}`} center={[c.lat, c.lng]} radius={8 + Math.sqrt(c.count) * 4} pathOptions={{ color: "#0F766E", weight: 2, fillColor: "#0F766E", fillOpacity: 0.3 }}>
                  <Popup>{c.count} requests in this ~{data.cellKm} km area (last {data.windowDays} days)</Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
          <p className="status" style={{ marginTop: 8 }}>
            Bigger circle = more requests. Areas are about {data.cellKm} km wide and shown only with {data.minPerCell}+ requests in the last {data.windowDays} days, so no single request or person can be picked out.
            {data.demoDataIncluded ? " Includes sample demo data." : ""}
          </p>
        </>
      )}
    </div>
  );
}
