import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Tent, MapPin, Calendar, Accessibility, Plus, Droplet } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { getCurrentLocation } from "../geolocation";
import Skeleton from "../components/Skeleton";

export default function CampsPage() {
  const { profile, firebaseUser } = useAuth();
  const role = profile?.user?.role;

  const [camps, setCamps] = useState(null);
  const [accessibleOnly, setAccessibleOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);

  function load() {
    api
      .get(`/api/camps?${accessibleOnly ? "accessibleOnly=true" : ""}`)
      .then((d) => setCamps(d.camps))
      .catch(() => setCamps([]));
  }

  useEffect(load, [accessibleOnly]);

  return (
    <div>
      {!firebaseUser && (
        <nav className="landing-nav">
          <Link to="/" className="sidebar-brand" style={{ padding: 0 }}>
            <span className="mark">
              <Droplet size={16} fill="currentColor" />
            </span>
            RaktSetu
          </Link>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <Link to="/login">Log in</Link>
            <Link to="/signup" className="btn-primary">
              Get started
            </Link>
          </div>
        </nav>
      )}

      <div className="page-header" style={firebaseUser ? {} : { maxWidth: 760, margin: "0 auto", padding: "28px 20px 0" }}>
        <h1>Donation camps</h1>
        <p>Upcoming blood donation camps — filter by accessibility if that matters for you.</p>
      </div>

      <div style={firebaseUser ? {} : { maxWidth: 760, margin: "0 auto", padding: "0 20px 48px" }}>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label className="checkbox-label">
            <input type="checkbox" checked={accessibleOnly} onChange={(e) => setAccessibleOnly(e.target.checked)} />
            <Accessibility size={14} /> Wheelchair-accessible only
          </label>
          {role === "hospital" && (
            <button className="secondary" onClick={() => setShowForm((v) => !v)}>
              <Plus size={14} /> {showForm ? "Cancel" : "Post a camp"}
            </button>
          )}
        </div>

        {showForm && (
          <PostCampForm
            onDone={() => {
              setShowForm(false);
              load();
            }}
          />
        )}
      </div>

      <div className="card">
        {camps === null ? (
          <Skeleton rows={3} />
        ) : camps.length === 0 ? (
          <div className="empty-state">
            <Tent size={26} className="empty-icon" />
            <p>No upcoming camps{accessibleOnly ? " matching that filter" : ""} yet.</p>
          </div>
        ) : (
          camps.map((c) => (
            <div key={c._id} className="list-row" style={{ alignItems: "flex-start" }}>
              <div className="list-row-main">
                <div className="row-icon" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                  <Tent size={16} />
                </div>
                <div>
                  <div className="row-title">{c.name}</div>
                  <div className="row-sub">
                    <Calendar size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                    {new Date(c.date).toLocaleDateString(undefined, { dateStyle: "medium" })} ·{" "}
                    <MapPin size={12} style={{ verticalAlign: "middle", marginRight: 2 }} />
                    {c.address}, {c.area}
                  </div>
                  <div className="row-sub">Hosted by {c.hospitalName}</div>
                  <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {c.accessibility?.wheelchairRamp && <span className="pill pill-verified">Wheelchair ramp</span>}
                    {c.accessibility?.groundFloor && <span className="pill pill-verified">Ground floor</span>}
                    {c.accessibility?.accessibleParking && <span className="pill pill-verified">Accessible parking</span>}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  );
}

function PostCampForm({ onDone }) {
  const [form, setForm] = useState({
    name: "",
    date: "",
    address: "",
    area: "",
    lat: "",
    lng: "",
    wheelchairRamp: false,
    groundFloor: false,
    accessibleParking: false,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleUseLocation() {
    try {
      const { lat, lng } = await getCurrentLocation();
      setForm((f) => ({ ...f, lat, lng }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/api/camps", {
        name: form.name,
        date: form.date,
        address: form.address,
        area: form.area,
        lat: form.lat,
        lng: form.lng,
        accessibility: {
          wheelchairRamp: form.wheelchairRamp,
          groundFloor: form.groundFloor,
          accessibleParking: form.accessibleParking,
        },
      });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 14 }}>
      <label>Camp name</label>
      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

      <label>Date</label>
      <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />

      <label>Address</label>
      <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />

      <label>Area</label>
      <input value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} required />

      <label>Location</label>
      <div className="location-row">
        <input placeholder="Latitude" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} required />
        <input placeholder="Longitude" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} required />
        <button type="button" className="ghost" onClick={handleUseLocation}>
          Use current location
        </button>
      </div>

      <label>Accessibility</label>
      <label className="checkbox-label" style={{ marginTop: 8 }}>
        <input
          type="checkbox"
          checked={form.wheelchairRamp}
          onChange={(e) => setForm({ ...form, wheelchairRamp: e.target.checked })}
        />
        Wheelchair ramp
      </label>
      <label className="checkbox-label" style={{ marginTop: 8 }}>
        <input
          type="checkbox"
          checked={form.groundFloor}
          onChange={(e) => setForm({ ...form, groundFloor: e.target.checked })}
        />
        Ground floor
      </label>
      <label className="checkbox-label" style={{ marginTop: 8 }}>
        <input
          type="checkbox"
          checked={form.accessibleParking}
          onChange={(e) => setForm({ ...form, accessibleParking: e.target.checked })}
        />
        Accessible parking
      </label>

      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy} style={{ marginTop: 14 }}>
        {busy ? "Posting..." : "Post camp"}
      </button>
    </form>
  );
}
