import { useEffect, useState } from "react";
import { MapPin, Phone, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { getCurrentLocation } from "../geolocation";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function ProfilePage() {
  const { profile } = useAuth();
  const role = profile?.user?.role;

  if (role === "donor") return <DonorProfile />;
  if (role === "hospital") return <HospitalProfile />;
  return <SeekerProfile />;
}

function HospitalProfile() {
  const { profile, firebaseUser } = useAuth();
  const initials = (profile?.user?.hospitalName || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div>
      <div className="page-header">
        <h1>Profile</h1>
        <p>Your hospital partner account details.</p>
      </div>
      <div className="card" style={{ maxWidth: 480 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div className="avatar" style={{ width: 56, height: 56, fontSize: "1.1rem" }}>
            {initials}
          </div>
          <div>
            <div className="row-title" style={{ fontSize: "1.05rem" }}>
              {profile?.user?.hospitalName}
            </div>
            <div className="row-sub">Hospital / blood bank partner</div>
          </div>
        </div>
        <div className="list-row">
          <span className="row-sub">
            <Mail size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Email
          </span>
          <span>{firebaseUser?.email}</span>
        </div>
        <div className="list-row">
          <span className="row-sub">
            <Phone size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Contact phone
          </span>
          <span>{profile?.user?.phone}</span>
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--text-soft)", marginTop: 14 }}>
          Requests must list your hospital name exactly as above to show up for verification.
        </p>
      </div>
    </div>
  );
}

function SeekerProfile() {
  const { profile, firebaseUser } = useAuth();
  const initials = (profile?.user?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div>
      <div className="page-header">
        <h1>Profile</h1>
        <p>Your RaktSetu account details.</p>
      </div>
      <div className="card" style={{ maxWidth: 480 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div className="avatar" style={{ width: 56, height: 56, fontSize: "1.1rem" }}>
            {initials}
          </div>
          <div>
            <div className="row-title" style={{ fontSize: "1.05rem" }}>
              {profile?.user?.name}
            </div>
            <div className="row-sub">Seeker</div>
          </div>
        </div>
        <div className="list-row">
          <span className="row-sub">
            <Mail size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Email
          </span>
          <span>{firebaseUser?.email}</span>
        </div>
        <div className="list-row">
          <span className="row-sub">
            <Phone size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Phone
          </span>
          <span>{profile?.user?.phone}</span>
        </div>
      </div>
    </div>
  );
}

function DonorProfile() {
  const { profile, firebaseUser } = useAuth();
  const [donor, setDonor] = useState(null);
  const [form, setForm] = useState({ bloodGroup: "O+", area: "", lat: "", lng: "" });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("about");

  useEffect(() => {
    api
      .get("/api/donors/me")
      .then((data) => {
        if (data.donor) {
          setDonor(data.donor);
          setForm({
            bloodGroup: data.donor.bloodGroup,
            area: data.donor.area,
            lat: data.donor.location.coordinates[1],
            lng: data.donor.location.coordinates[0],
          });
        }
      })
      .catch((err) => setStatus(err.message));
  }, []);

  async function handleUseLocation() {
    try {
      const { lat, lng } = await getCurrentLocation();
      setForm((f) => ({ ...f, lat, lng }));
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const data = await api.post("/api/donors", {
        ...form,
        available: donor ? donor.available : true,
      });
      setDonor(data.donor);
      setStatus("Profile saved.");
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleAvailability() {
    setBusy(true);
    try {
      const data = await api.patch("/api/donors/me/availability", { available: !donor.available });
      setDonor(data.donor);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  }

  const initials = (profile?.user?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div>
      <div className="page-header">
        <h1>Donor profile</h1>
        <p>Keep this up to date so seekers can find and reach you.</p>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="avatar" style={{ width: 56, height: 56, fontSize: "1.1rem" }}>
              {initials}
            </div>
            <div>
              <div className="row-title" style={{ fontSize: "1.05rem" }}>
                {profile?.user?.name}
              </div>
              <div className="row-sub">
                {donor?.bloodGroup} · <MapPin size={12} style={{ verticalAlign: "middle" }} /> {donor?.area}
              </div>
            </div>
          </div>
          {donor && (
            <span className={`pill ${donor.available ? "pill-available" : "pill-unavailable"}`}>
              {donor.available ? "Available" : "Not available"}
            </span>
          )}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "about" ? "active" : ""}`} onClick={() => setTab("about")}>
          About
        </button>
        <button className={`tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
          Donation history
        </button>
        <button className={`tab ${tab === "availability" ? "active" : ""}`} onClick={() => setTab("availability")}>
          Availability
        </button>
      </div>

      {tab === "about" && (
        <form onSubmit={handleSave} className="card">
          <div className="list-row">
            <span className="row-sub">
              <Mail size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
              Email
            </span>
            <span>{firebaseUser?.email}</span>
          </div>
          <div className="list-row">
            <span className="row-sub">
              <Phone size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
              Phone
            </span>
            <span>{profile?.user?.phone}</span>
          </div>

          <label>Blood group</label>
          <select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>

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

          {status && <p className="status">{status}</p>}
          <button type="submit" disabled={busy}>
            {busy ? "Saving..." : "Save changes"}
          </button>
        </form>
      )}

      {tab === "history" && (
        <div className="card">
          {!donor?.donationHistory?.length ? (
            <div className="empty-state">
              <div className="emoji">🩸</div>
              <p>No donations logged yet.</p>
            </div>
          ) : (
            donor.donationHistory.map((h, i) => (
              <div key={i} className="list-row">
                <span>Donation</span>
                <span className="row-time">{new Date(h.date).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "availability" && donor && (
        <div className="card">
          <div className={`availability-card ${donor.available ? "is-available" : ""}`} style={{ margin: 0 }}>
            <span>
              You are currently: <strong>{donor.available ? "Available" : "Not available"}</strong>
            </span>
            <button className={donor.available ? "ghost" : ""} onClick={toggleAvailability} disabled={busy}>
              {donor.available ? "Mark as unavailable" : "Mark as available"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
