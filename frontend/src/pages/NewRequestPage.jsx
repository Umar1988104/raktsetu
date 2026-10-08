import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { HeartHandshake, Siren } from "lucide-react";
import { api } from "../api";
import { getCurrentLocation } from "../geolocation";
import { useAuth } from "../context/AuthContext";
import VoiceInputButton from "../components/VoiceInputButton";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const URGENCY_LEVELS = ["Normal", "Urgent", "Critical"];

export default function NewRequestPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const isSos = searchParams.get("sos") === "1";
  const familyMembers = profile?.user?.familyMembers || [];
  const [form, setForm] = useState({
    familyMemberId: "",
    bloodGroup: "O+",
    units: 1,
    urgency: isSos ? "Urgent" : "Normal",
    hospital: "",
    area: "",
    lat: "",
    lng: "",
    notes: "",
  });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  // SOS mode: immediately grab location so there's one less step between
  // opening the form and submitting.
  useEffect(() => {
    if (isSos) {
      getCurrentLocation()
        .then(({ lat, lng }) => setForm((f) => ({ ...f, lat, lng })))
        .catch(() => {});
    }
  }, [isSos]);

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
      if (data.awaitingHospitalVerification) {
        navigate(`/requests/${data.request._id}`, {
          state: { justCreatedCritical: true },
        });
      } else {
        navigate(`/requests/${data.request._id}`);
      }
    } catch (err) {
      setStatus(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>{isSos && <Siren size={22} style={{ color: "var(--primary)", verticalAlign: "middle", marginRight: 8 }} />}New request</h1>
        <p>
          {isSos
            ? "SOS mode — urgency and your location are pre-filled. Just add the essentials and submit."
            : "Fill in the details below — we'll find the best matching donors for you."}
        </p>
      </div>

      <div className="two-col">
        <form onSubmit={handleSubmit} className="card">
          {familyMembers.length > 0 && (
            <>
              <label>Who needs blood?</label>
              <select
                value={form.familyMemberId}
                onChange={(e) => {
                  const fm = familyMembers.find((m) => m._id === e.target.value);
                  setForm({
                    ...form,
                    familyMemberId: e.target.value,
                    bloodGroup: fm?.bloodGroup || form.bloodGroup,
                  });
                }}
              >
                <option value="">Myself</option>
                {familyMembers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} {m.relation ? `(${m.relation})` : ""}
                  </option>
                ))}
              </select>
            </>
          )}

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

          {form.urgency === "Critical" && (
            <p className="status" style={{ marginTop: 10 }}>
              Critical requests are held for hospital verification before donors are notified, to
              prevent misuse of the highest urgency tier. Make sure the hospital name below exactly
              matches a registered hospital partner account, or it won't be picked up.
            </p>
          )}

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
