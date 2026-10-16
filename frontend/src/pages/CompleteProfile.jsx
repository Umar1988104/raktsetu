import SegmentedControl from "../components/SegmentedControl";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function CompleteProfile() {
  const { completeProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("seeker");
  const [hospitalName, setHospitalName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await completeProfile({ name, phone, role, hospitalName });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h2>Tell us a bit about you</h2>
        <form onSubmit={handleSubmit}>
          <label>Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />

          <label>Phone number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit mobile number"
            required
          />

          <label>I am a...</label>
          <SegmentedControl
            block
            large
            label="I am a"
            value={role}
            onChange={setRole}
            options={[
              { value: "seeker", label: "Seeker" },
              { value: "donor", label: "Donor" },
              { value: "hospital", label: "Hospital" },
            ]}
          />
          <p className="status" style={{ marginTop: 8 }}>
            {role === "seeker" && "Blood seeker — you raise requests for yourself or family."}
            {role === "donor" && "Donor — you get matched to requests near you."}
            {role === "hospital" && "Hospital / blood bank partner — you verify Critical requests and donors."}
          </p>

          {role === "hospital" && (
            <>
              <label>Hospital / blood bank name</label>
              <input
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                placeholder="Must exactly match the hospital name seekers will enter"
                required
              />
            </>
          )}

          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
