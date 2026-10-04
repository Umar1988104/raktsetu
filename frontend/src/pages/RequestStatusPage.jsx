import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Check } from "lucide-react";
import { api } from "../api";
import { UrgencyPill } from "../components/StatusPill";

const STAGES = ["Searching", "Contacted", "Confirmed", "Fulfilled"];
const STAGE_LABELS = {
  Searching: "Searching Donors",
  Contacted: "Contacting Donors",
  Confirmed: "Donor Confirmed",
  Fulfilled: "Fulfilled",
};

function pinIcon(color, label) {
  return L.divIcon({
    html: `<div style="background:${color};color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.35);">${label}</div>`,
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

export default function RequestStatusPage() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api
      .get(`/api/requests/${id}`)
      .then((d) => setRequest(d.request))
      .catch((err) => setError(err.message));
    api
      .get(`/api/requests/${id}/matches`)
      .then(setMatchData)
      .catch(() => {});
  }

  useEffect(() => {
    load();
  }, [id]);

  async function advanceStatus(newStatus) {
    setBusy(true);
    try {
      await api.patch(`/api/requests/${id}/status`, { status: newStatus });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!request) return <p className="loading">Loading...</p>;

  const currentIndex = STAGES.indexOf(request.status);
  const isExpired = request.status === "Expired";

  return (
    <div>
      <div className="page-header">
        <h1>
          {request.bloodGroup} · {request.units} unit(s)
        </h1>
        <p>Track the status of your blood request in real time.</p>
      </div>

      {request.urgency === "Critical" && !request.hospitalVerified && request.status === "Searching" && (
        <div className="availability-card" style={{ marginBottom: 20 }}>
          <span>
            Awaiting verification from <strong>{request.hospital}</strong> before donors are notified —
            this happens automatically once they verify it.
          </span>
        </div>
      )}

      {!isExpired && (
        <div className="card">
          <div className="icon-stepper">
            {STAGES.map((stage, i) => {
              const done = i < currentIndex || request.status === "Fulfilled";
              const current = i === currentIndex && request.status !== "Fulfilled";
              return (
                <div key={stage} className={`step ${done ? "done" : ""} ${current ? "current" : ""}`}>
                  <span className="dot">{done ? <Check size={16} /> : i + 1}</span>
                  <span className="label">{STAGE_LABELS[stage]}</span>
                </div>
              );
            })}
          </div>

          {request.status !== "Fulfilled" && !(request.urgency === "Critical" && !request.hospitalVerified) && (
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {STAGES.slice(currentIndex + 1).map((stage) => (
                <button key={stage} className="secondary" disabled={busy} onClick={() => advanceStatus(stage)}>
                  Mark as {STAGE_LABELS[stage]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="two-col">
        <div className="card">
          <h3>Request details</h3>
          <div className="list-row">
            <span className="row-sub">Blood group</span>
            <strong>{request.bloodGroup}</strong>
          </div>
          <div className="list-row">
            <span className="row-sub">Units</span>
            <strong>{request.units}</strong>
          </div>
          <div className="list-row">
            <span className="row-sub">Hospital</span>
            <strong>{request.hospital}</strong>
          </div>
          <div className="list-row">
            <span className="row-sub">Area</span>
            <strong>{request.area}</strong>
          </div>
          <div className="list-row">
            <span className="row-sub">Urgency</span>
            <UrgencyPill urgency={request.urgency} />
          </div>
          {request.notes && (
            <div className="list-row">
              <span className="row-sub">Notes</span>
              <span>{request.notes}</span>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Nearby compatible donors</h3>
          {!matchData ? (
            <p className="loading">Searching...</p>
          ) : matchData.matches.length === 0 ? (
            <p className="empty-note">No available, compatible donors found nearby yet.</p>
          ) : (
            <>
              <div className="map-wrap">
                <MapContainer
                  center={[matchData.request.coordinates[1], matchData.request.coordinates[0]]}
                  zoom={11}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker
                    position={[matchData.request.coordinates[1], matchData.request.coordinates[0]]}
                    icon={pinIcon("#E6364A", "R")}
                  >
                    <Popup>Your request location</Popup>
                  </Marker>
                  {matchData.matches.map((m, i) => (
                    <Marker key={m._id} position={[m.coordinates[1], m.coordinates[0]]} icon={pinIcon("#2F80ED", i + 1)}>
                      <Popup>
                        {m.donor?.name} · {m.bloodGroup} · {m.distanceKm} km
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
              <ul className="match-list">
                {matchData.matches.map((m, i) => (
                  <li key={m._id}>
                    <span>
                      #{i + 1} {m.donor?.name} · {m.bloodGroup}
                    </span>
                    <span className="match-distance">{m.distanceKm} km</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
