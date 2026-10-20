import { useState, useEffect, useId } from "react";
import Sheet from "./Sheet";
import Switch from "./Switch";
import { api } from "../api";
import { useToast } from "./UiFeedback";

// When may RaktSetu contact this donor? (v1.9) Skipped donors are not removed
// from the pool: later search rounds can still reach them, and they can always
// see and answer requests in the app. Times are India time (IST).
export default function SchedulePreferencesSheet({ donor, open, onClose, onSaved }) {
  const uid = useId();
  const toast = useToast();
  const [emergenciesOnly, setEmergenciesOnly] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [start, setStart] = useState("22:00");
  const [end, setEnd] = useState("07:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && donor?.schedule) {
      setEmergenciesOnly(!!donor.schedule.emergenciesOnly);
      setQuiet(!!donor.schedule.quietHours?.enabled);
      setStart(donor.schedule.quietHours?.start || "22:00");
      setEnd(donor.schedule.quietHours?.end || "07:00");
      setError("");
    }
  }, [open, donor]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.patch(`/api/donors/${donor._id}/schedule`, { emergenciesOnly, quietHours: { enabled: quiet, start, end } });
      toast("Contact preferences saved.", "success");
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} labelledBy={`${uid}-t`}>
      <h3 id={`${uid}-t`}>When can we contact you?</h3>
      <p className="sheet-sub">You stay in the donor pool either way, and you can always open the app and answer requests.</p>

      <form onSubmit={save}>
        <div className="sheet-section">
          <div className="switch-row">
            <label htmlFor={`${uid}-eo`} className="switch-text">
              <span className="switch-label">Emergencies only</span>
              <span className="switch-hint">Only Urgent and Critical requests. We won't contact you for Normal ones.</span>
            </label>
            <Switch id={`${uid}-eo`} checked={emergenciesOnly} onChange={setEmergenciesOnly} label="Emergencies only" />
          </div>
        </div>

        <div className="sheet-section">
          <div className="switch-row">
            <label htmlFor={`${uid}-q`} className="switch-text">
              <span className="switch-label">Quiet hours</span>
              <span className="switch-hint">During these hours only Critical requests will contact you.</span>
            </label>
            <Switch id={`${uid}-q`} checked={quiet} onChange={setQuiet} label="Quiet hours" />
          </div>
          {quiet && (
            <div className="time-row" style={{ marginTop: 8 }}>
              <div>
                <label htmlFor={`${uid}-s`}>From</label>
                <input id={`${uid}-s`} type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
              </div>
              <div>
                <label htmlFor={`${uid}-e`}>Until</label>
                <input id={`${uid}-e`} type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
              </div>
            </div>
          )}
          {quiet && <p className="field-hint">India time (IST). Example: 22:00 to 07:00 covers the night.</p>}
        </div>

        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save preferences"}</button>
        <button type="button" className="ghost" onClick={onClose}>Cancel</button>
      </form>
    </Sheet>
  );
}
