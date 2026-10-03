import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HeartHandshake } from "lucide-react";
import { api } from "../api";
import { getCurrentLocation } from "../geolocation";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const URGENCY_LEVELS = ["Normal", "Urgent", "Critical"];

export default function NewRequestPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    bloodGroup: "O+",
    units: 1,
    urgency: "Normal",
    hospital: "",
    area: "",
    lat: "",
    lng: "",
    notes: "",
  });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleUseLocation() {
    try {
      const { lat, lng } = await getCurrentLocation();
      setForm((f) => ({ ...f, lat, lng }));
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const data = await api.post("/api/requests", form);
      navigate(`/requests/${data.request._id}`);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>New request</h1>
        <p>Fill in the details below — we'll find the best matching donors for you.</p>
      </div>

      <div className="two-col">
        <form onSubmit={handleSubmit} className="card">
          <label>Blood group required</label>
          <select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>

          <label>Units required</label>
          <input
            type="number"
            min={1}
            value={form.units}
            onChange={(e) => setForm({ ...form, units: Number(e.target.value) })}
          />

          <label>Hospital</label>
          <input value={form.hospital} onChange={(e) => setForm({ ...form, hospital: e.target.value })} required />

          <label>Area</label>
          <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} required />

          <label>Location</label>
          <div className="location-row">
            <input
              placeholder="Latitude"
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
              required
            />
            <input
              placeholder="Longitude"
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
              required
            />
            <button type="button" className="ghost" onClick={handleUseLocation}>
              Use current location
            </button>
          </div>

          <label>Urgency level</label>
          <div style={{ display: "flex", gap: 8 }}>
            {URGENCY_LEVELS.map((u) => (
              <button
                key={u}
                type="button"
                className={form.urgency === u ? "" : "ghost"}
                onClick={() => setForm({ ...form, urgency: u })}
                style={{ flex: 1, justifyContent: "center" }}
              >
                {u}
              </button>
            ))}
          </div>

          <label>Notes (optional)</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Add any additional information (e.g. ward, contact, timing)"
          />

          {status && <p className="error">{status}</p>}
          <button type="submit" disabled={busy}>
            {busy ? "Submitting..." : "Submit request"}
          </button>
        </form>

        <div className="cta-panel">
          <div className="cta-icon">
            <HeartHandshake size={40} style={{ margin: "0 auto" }} />
          </div>
          <h3 style={{ color: "#fff" }}>Need blood urgently?</h3>
          <p>We'll rank compatible, available donors by distance the moment you submit this request.</p>
        </div>
      </div>
    </div>
  );
}
