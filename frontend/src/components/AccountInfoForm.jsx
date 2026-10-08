import { useState } from "react";
import { Mail } from "lucide-react";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import PhotoUpload from "./PhotoUpload";

const PHONE_REGEX = /^[6-9]\d{9}$/;

export default function AccountInfoForm() {
  const { profile, firebaseUser, refreshProfile } = useAuth();
  const user = profile?.user;

  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    alternatePhone: user?.alternatePhone || "",
    address: user?.address || "",
    photo: user?.photo || "",
  });
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  function validate() {
    if (!PHONE_REGEX.test(form.phone)) return "Phone must be a 10-digit Indian mobile number";
    if (form.alternatePhone && !PHONE_REGEX.test(form.alternatePhone)) {
      return "Alternate phone must be a 10-digit Indian mobile number";
    }
    return null;
  }

  async function handleSave(e) {
    e.preventDefault();
    const v = validate();
    if (v) return setError(v);

    setBusy(true);
    setError("");
    setStatus("");
    try {
      await api.patch("/api/auth/me", form);
      await refreshProfile();
      setStatus("Saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="card">
      <h3>Account info</h3>

      <PhotoUpload value={form.photo} onChange={(photo) => setForm({ ...form, photo })} />

      <label>Full name</label>
      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />

      <div className="list-row" style={{ padding: "10px 0" }}>
        <span className="row-sub">
          <Mail size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
          Email
        </span>
        <span>{firebaseUser?.email}</span>
      </div>

      <label>Phone</label>
      <input
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
        placeholder="10-digit mobile number"
        required
      />

      <label>Alternate phone (optional)</label>
      <input
        value={form.alternatePhone}
        onChange={(e) => setForm({ ...form, alternatePhone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
        placeholder="10-digit mobile number"
      />

      <label>Address (optional)</label>
      <textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />

      {error && <p className="error">{error}</p>}
      {status && <p className="status">{status}</p>}
      <button type="submit" disabled={busy}>
        {busy ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
