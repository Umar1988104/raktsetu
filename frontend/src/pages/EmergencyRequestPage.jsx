import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signInAnonymously } from "firebase/auth";
import { Droplet, ShieldAlert } from "lucide-react";
import { auth } from "../firebase";
import { api } from "../api";
import { getCurrentLocation } from "../geolocation";
import { useAuth } from "../context/AuthContext";
import VoiceInputButton from "../components/VoiceInputButton";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function EmergencyRequestPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    bloodGroup: "O+",
    units: 1,
    urgency: "Urgent",
    hospital: "",
    area: "",
    lat: "",
    lng: "",
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
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      await api.post("/api/auth/guest-register", { name: form.name, phone: form.phone });
      await refreshProfile();

      const data = await api.post("/api/requests", {
        bloodGroup: form.bloodGroup,
        units: form.units,
        urgency: form.urgency,
        hospital: form.hospital,
        area: form.area,
        lat: form.lat,
        lng: form.lng,
      });

      navigate(`/requests/${data.request._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell" style={{ alignItems: "flex-start", paddingTop: 40 }}>
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <Link to="/" className="sidebar-brand" style={{ padding: 0, marginBottom: 18 }}>
          <span className="mark">
            <Droplet size={16} fill="currentColor" />
          </span>
          RaktSetu
        </Link>

        <h2>Emergency blood request</h2>
        <p style={{ color: "var(--text-soft)", fontSize: "0.9rem", marginTop: -8, marginBottom: 10 }}>
          <ShieldAlert size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
          No account needed. Limited to one request per 24 hours from this network to prevent misuse.
        </p>

        <form onSubmit={handleSubmit}>
          <label>Your name</label>
          <div className="location-row">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{ flex: 1 }}
              required
            />
            <VoiceInputButton onResult={(text) => setForm({ ...form, name: text })} />
          </div>

          <label>Your phone</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
            placeholder="10-digit mobile number"
            required
          />

          <label>Blood group needed</label>
          <select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>

          <label>Units needed</label>
          <input
            type="number"
            min={1}
            value={form.units}
            onChange={(e) => setForm({ ...form, units: Number(e.target.value) })}
          />

          <label>Urgency</label>
          <div style={{ display: "flex", gap: 8 }}>
            {["Normal", "Urgent"].map((u) => (
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
          <p style={{ fontSize: "0.78rem", color: "var(--text-soft)", marginTop: 6 }}>
            Critical-urgency requests need hospital verification and aren't available in the quick
            guest flow —{" "}
            <Link to="/signup">create a full account</Link> if this is Critical.
          </p>

          <label>Hospital</label>
          <div className="location-row">
            <input
              value={form.hospital}
              onChange={(e) => setForm({ ...form, hospital: e.target.value })}
              style={{ flex: 1 }}
              required
            />
            <VoiceInputButton onResult={(text) => setForm({ ...form, hospital: text })} />
          </div>

          <label>Area</label>
          <div className="location-row">
            <input
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
              style={{ flex: 1 }}
              required
            />
            <VoiceInputButton onResult={(text) => setForm({ ...form, area: text })} />
          </div>

          <label>Location</label>
          <div className="location-row">
            <input placeholder="Latitude" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} required />
            <input placeholder="Longitude" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} required />
            <button type="button" className="ghost" onClick={handleUseLocation}>
              Use current location
            </button>
          </div>

          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>
            {busy ? "Submitting..." : "Submit emergency request"}
          </button>
        </form>

        <p style={{ marginTop: 14, fontSize: "0.85rem", textAlign: "center" }}>
          Have an account? <Link to="/login">Log in</Link> instead for full features.
        </p>
      </div>
    </div>
  );
}
