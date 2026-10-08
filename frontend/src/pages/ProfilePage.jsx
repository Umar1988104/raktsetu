import { useEffect, useState } from "react";
import { MapPin, Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { getCurrentLocation } from "../geolocation";
import AccountInfoForm from "../components/AccountInfoForm";
import FamilyMembersSection from "../components/FamilyMembersSection";
import Skeleton from "../components/Skeleton";
import EligibilityCheck from "../components/EligibilityCheck";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const role = profile?.user?.role;

  async function handleFamilyChange() {
    await refreshProfile();
  }

  if (role === "donor") return <DonorProfile />;

  return (
    <div>
      <div className="page-header">
        <h1>Profile</h1>
        <p>Your RaktSetu account details.</p>
      </div>
      <AccountInfoForm />
      {role === "seeker" && (
        <FamilyMembersSection familyMembers={profile?.user?.familyMembers} onChange={handleFamilyChange} />
      )}
      {role === "hospital" && (
        <div className="card" style={{ maxWidth: 480 }}>
          <h3>Hospital details</h3>
          <div className="list-row">
            <span className="row-sub">Hospital / blood bank name</span>
            <strong>{profile?.user?.hospitalName}</strong>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-soft)", marginTop: 10 }}>
            Requests must list this name exactly to show up for your verification.
          </p>
        </div>
      )}
    </div>
  );
}

function DonorProfile() {
  const { profile, refreshProfile } = useAuth();
  const [donors, setDonors] = useState(null);
  const [error, setError] = useState("");
  const [creatingFor, setCreatingFor] = useState(null); // null closed, "self", or a familyMemberId

  function load() {
    api
      .get("/api/donors/me")
      .then((d) => setDonors(d.donors))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleFamilyChange() {
    await refreshProfile();
  }

  const familyMembers = profile?.user?.familyMembers || [];
  const hasSelfProfile = donors?.some((d) => !d.familyMemberId);
  const familyIdsWithProfile = new Set((donors || []).filter((d) => d.familyMemberId).map((d) => d.familyMemberId));
  const availableFamilyMembers = familyMembers.filter((m) => !familyIdsWithProfile.has(m._id));

  return (
    <div>
      <div className="page-header">
        <h1>Donor profile</h1>
        <p>Manage your own donor profile, or register a family member as a donor too.</p>
      </div>

      <AccountInfoForm />
      <FamilyMembersSection familyMembers={familyMembers} onChange={handleFamilyChange} />

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h3 style={{ margin: 0, border: "none", padding: 0 }}>Donor profiles</h3>
        </div>
        <p style={{ color: "var(--text-soft)", fontSize: "0.85rem", marginTop: 6, marginBottom: 14 }}>
          Each profile below can be matched to requests independently — useful if more than one
          person in your household donates.
        </p>

        {error && <p className="error">{error}</p>}
        {donors === null ? (
          <Skeleton rows={2} />
        ) : (
          <>
            {donors.map((d) => (
              <DonorProfileCard key={d._id} donor={d} onSaved={load} />
            ))}

            {!hasSelfProfile && creatingFor !== "self" && (
              <button className="secondary" onClick={() => setCreatingFor("self")} style={{ marginTop: 8 }}>
                <Plus size={14} /> Create your own donor profile
              </button>
            )}
            {availableFamilyMembers.map(
              (m) =>
                creatingFor !== m._id && (
                  <button
                    key={m._id}
                    className="secondary"
                    onClick={() => setCreatingFor(m._id)}
                    style={{ marginTop: 8, marginLeft: 8 }}
                  >
                    <Plus size={14} /> Add donor profile for {m.name}
                  </button>
                )
            )}

            {creatingFor && (
              <DonorProfileForm
                familyMemberId={creatingFor === "self" ? null : creatingFor}
                label={creatingFor === "self" ? "you" : familyMembers.find((m) => m._id === creatingFor)?.name}
                onDone={() => {
                  setCreatingFor(null);
                  load();
                }}
                onCancel={() => setCreatingFor(null)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

const TIER_CLASS = { New: "pill-expired", Trusted: "pill-confirmed", Pillar: "pill-verified" };

function DonorProfileCard({ donor, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function turnOff() {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/api/donors/${donor._id}/availability`, { available: false });
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  async function confirmEligibleAndTurnOn() {
    setBusy(true);
    setError("");
    try {
      await api.patch(`/api/donors/${donor._id}/availability`, { available: true, eligibilityConfirmed: true });
      setCheckingEligibility(false);
      onSaved();
    } catch (err) {
      setError(err.message);
      setCheckingEligibility(false);
    } finally {
      setBusy(false);
    }
  }

  if (checkingEligibility) {
    return (
      <EligibilityCheck onConfirm={confirmEligibleAndTurnOn} onCancel={() => setCheckingEligibility(false)} />
    );
  }

  if (editing) {
    return (
      <DonorProfileForm
        existing={donor}
        familyMemberId={donor.familyMemberId}
        label={donor.display?.name}
        onDone={() => {
          setEditing(false);
          onSaved();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="donor-card">
      <div className="donor-card-main">
        <div className="avatar">{(donor.display?.name || "?")[0]?.toUpperCase()}</div>
        <div>
          <div className="row-title">
            {donor.display?.name}
            {donor.display?.relation && <span className="row-sub"> · {donor.display.relation}</span>}
          </div>
          <div className="row-sub">
            {donor.bloodGroup} · <MapPin size={12} style={{ verticalAlign: "middle" }} /> {donor.area}
          </div>
          <div style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className={`pill ${donor.available ? "pill-available" : "pill-unavailable"}`}>
              {donor.available ? "Available" : "Not available"}
            </span>
            {donor.verified && <span className="pill pill-verified">Verified</span>}
            <span className={`pill ${TIER_CLASS[donor.trustTier] || "pill-expired"}`}>{donor.trustTier}</span>
          </div>
          {donor.nextEligibleDate && (
            <div className="row-sub" style={{ marginTop: 4 }}>
              Next eligible to donate: {new Date(donor.nextEligibleDate).toLocaleDateString()}
            </div>
          )}
          {error && <p className="error" style={{ marginTop: 6 }}>{error}</p>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="ghost" onClick={() => setEditing(true)}>
          Edit
        </button>
        {donor.available ? (
          <button className="ghost" onClick={turnOff} disabled={busy}>
            Mark unavailable
          </button>
        ) : (
          <button onClick={() => setCheckingEligibility(true)} disabled={busy}>
            Mark available
          </button>
        )}
      </div>
    </div>
  );
}

function DonorProfileForm({ existing, familyMemberId, label, onDone, onCancel }) {
  const [form, setForm] = useState({
    bloodGroup: existing?.bloodGroup || "O+",
    area: existing?.area || "",
    lat: existing?.location?.coordinates?.[1] || "",
    lng: existing?.location?.coordinates?.[0] || "",
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

  async function handleSave(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/api/donors", {
        ...form,
        familyMemberId,
        available: existing ? existing.available : true,
      });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSave} style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 10 }}>
      <p className="status" style={{ marginTop: 0 }}>
        Donor profile for <strong>{label}</strong>
      </p>

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

      {error && <p className="error">{error}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button type="submit" disabled={busy}>
          {busy ? "Saving..." : "Save"}
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
