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
          <div className="role-pick">
            <label>
              <input
                type="radio"
                name="role"
                value="seeker"
                checked={role === "seeker"}
                onChange={() => setRole("seeker")}
              />
              Blood seeker (raising a request)
            </label>
            <label>
              <input
                type="radio"
                name="role"
                value="donor"
                checked={role === "donor"}
                onChange={() => setRole("donor")}
              />
              Donor
            </label>
            <label>
              <input
                type="radio"
                name="role"
                value="hospital"
                checked={role === "hospital"}
                onChange={() => setRole("hospital")}
              />
              Hospital / blood bank partner
            </label>
          </div>

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
