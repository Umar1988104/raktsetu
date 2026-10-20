import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Tent, MapPin, Calendar, Accessibility, Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { getCurrentLocation } from "../geolocation";
import Skeleton from "../components/Skeleton";
import Sheet from "../components/Sheet";
import { useConfirm, useToast } from "../components/UiFeedback";

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
      <div className="page-header">
        <h1>Donation camps</h1>
        <p>Upcoming blood donation camps — filter by accessibility if that matters for you.</p>
      </div>

      <div>

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

      {role === "hospital" && profile?.user?.partnerVerified && <ManageMyCamps onChanged={load} refreshKey={camps} />}

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
                    <MapPin size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                    {c.address}, {c.area}
                  </div>
                  <div className="row-sub">Hosted by {c.hospitalName}</div>
                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
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
    <form onSubmit={handleSubmit} style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 16 }}>
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
      <button type="submit" disabled={busy} style={{ marginTop: 16 }}>
        {busy ? "Posting..." : "Post camp"}
      </button>
    </form>
  );
}

// A hospital's own camps: edit or cancel them (v1.9).
function ManageMyCamps({ onChanged, refreshKey }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [mine, setMine] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = () => api.get("/api/camps/mine").then((d) => setMine(d.camps)).catch(() => setMine([]));
  useEffect(() => { load(); }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  async function cancel(camp) {
    const ok = await confirm({
      title: `Cancel “${camp.name}”?`,
      message: "It disappears from the camps list for everyone.",
      confirmLabel: "Cancel camp",
      cancelLabel: "Keep camp",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await api.del(`/api/camps/${camp._id}`);
      toast("Camp cancelled.", "success");
      load();
      onChanged();
    } catch (err) {
      toast(err.message, "error");
    }
  }

  if (!mine || mine.length === 0) return null;
  return (
    <div className="card">
      <h3>Your camps</h3>
      {mine.map((c) => (
        <div key={c._id} className="plan-row">
          <div>
            <div className="row-title">{c.name}</div>
            <div className="row-sub">{new Date(c.date).toLocaleDateString(undefined, { dateStyle: "medium" })} · {c.address}, {c.area}</div>
          </div>
          <div className="plan-actions">
            <button type="button" className="ghost" onClick={() => setEditing(c)}><Pencil size={14} /> Edit</button>
            <button type="button" className="ghost" onClick={() => cancel(c)}><Trash2 size={14} /> Cancel</button>
          </div>
        </div>
      ))}
      <EditCampSheet camp={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); onChanged(); }} />
    </div>
  );
}

function EditCampSheet({ camp, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (camp) {
      setForm({
        name: camp.name,
        date: new Date(camp.date).toISOString().slice(0, 10),
        address: camp.address,
        area: camp.area,
        wheelchairRamp: !!camp.accessibility?.wheelchairRamp,
        groundFloor: !!camp.accessibility?.groundFloor,
        accessibleParking: !!camp.accessibility?.accessibleParking,
      });
      setError("");
    }
  }, [camp]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.patch(`/api/camps/${camp._id}`, {
        name: form.name,
        date: form.date,
        address: form.address,
        area: form.area,
        accessibility: { wheelchairRamp: form.wheelchairRamp, groundFloor: form.groundFloor, accessibleParking: form.accessibleParking },
      });
      toast("Camp updated.", "success");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={!!camp} onClose={onClose} labelledBy="edit-camp-title">
      <h3 id="edit-camp-title">Edit camp</h3>
      {form && (
        <form onSubmit={save}>
          <label htmlFor="ec-name">Camp name</label>
          <input id="ec-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <label htmlFor="ec-date">Date</label>
          <input id="ec-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          <label htmlFor="ec-address">Address</label>
          <input id="ec-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
          <label htmlFor="ec-area">Area</label>
          <input id="ec-area" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} required />
          {[["wheelchairRamp", "Wheelchair ramp"], ["groundFloor", "Ground floor"], ["accessibleParking", "Accessible parking"]].map(([k, label]) => (
            <label key={k} className="checkbox-label" style={{ marginTop: 8 }}>
              <input type="checkbox" checked={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} />
              {label}
            </label>
          ))}
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
        </form>
      )}
    </Sheet>
  );
}
