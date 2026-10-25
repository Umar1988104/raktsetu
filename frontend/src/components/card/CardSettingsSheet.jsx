import { useState, useId, useEffect } from "react";
import Sheet from "../Sheet";
import Switch from "../Switch";

const FIELDS = [
  { key: "name", label: "First name + initial", hint: "e.g. “Rohan S.” — never your full name." },
  { key: "bloodGroup", label: "Blood group", hint: "" },
  { key: "tier", label: "Trust badge", hint: "New, Trusted or Pillar." },
  { key: "verified", label: "Verified mark", hint: "Shows if a hospital partner verified you." },
  { key: "memberSince", label: "Member since (year)", hint: "Year only." },
  { key: "eligibleToday", label: "“Eligible to donate today”", hint: "A plain yes or no — never dates or history." },
  { key: "referrals", label: "Donors I invited", hint: "Only a number: how many friends you invited have donated." },
];

// Everything the owner controls about what the public QR page can show.
export default function CardSettingsSheet({ card, open, onClose, onChange, onRegenerate }) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const partner = card?.kind === "partner";
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [ecError, setEcError] = useState("");

  useEffect(() => {
    if (card?.emergencyContact) {
      setEcName(card.emergencyContact.name || "");
      setEcPhone(card.emergencyContact.phone || "");
    }
    setEcError("");
  }, [card?.cardId, open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!card) return null;
  const ec = card.emergencyContact;

  async function saveEmergency(e, enabled) {
    e?.preventDefault();
    setEcError("");
    const err = await onChange(card.cardId, { emergencyContact: { enabled, name: ecName, phone: ecPhone } });
    if (err) setEcError(err);
  }

  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId}>
      <h3 id={titleId}>Card privacy</h3>
      <p className="sheet-sub">
        Anyone with your card ID or QR code can open your card's verify page. You choose exactly what it shows.
        Your phone number, email and address are never on it.
      </p>

      <div className="sheet-section">
        <div className="switch-row">
          <label htmlFor={`${uid}-hidden`} className="switch-text">
            <span className="switch-label">Hide this card publicly</span>
            <span className="switch-hint">The QR page will say “Card not found”. You can still use the card yourself.</span>
          </label>
          <Switch id={`${uid}-hidden`} checked={card.settings.hidden} onChange={(v) => onChange(card.cardId, { hidden: v })} label="Hide this card publicly" />
        </div>
      </div>

      {!partner && (
        <div className="sheet-section">
          <span className="sheet-label">What the verify page shows</span>
          {FIELDS.map((f) => (
            <div key={f.key} className="switch-row" style={{ padding: "8px 0" }}>
              <label htmlFor={`${uid}-${f.key}`} className="switch-text">
                <span className="switch-label">{f.label}</span>
                {f.hint && <span className="switch-hint">{f.hint}</span>}
              </label>
              <Switch
                id={`${uid}-${f.key}`}
                checked={!!card.settings.show[f.key]}
                disabled={card.settings.hidden}
                onChange={(v) => onChange(card.cardId, { show: { [f.key]: v } })}
                label={f.label}
              />
            </div>
          ))}
        </div>
      )}

      {!partner && (
        <div className="sheet-section">
          <span className="sheet-label">Emergency contact (optional)</span>
          <p className="sheet-sub" style={{ marginTop: 0 }}>
            Printed on the back of your card and the downloaded image only. It is never shown online.
          </p>
          <form onSubmit={(e) => saveEmergency(e, true)}>
            <label htmlFor={`${uid}-ecn`}>Name</label>
            <input id={`${uid}-ecn`} value={ecName} onChange={(e) => setEcName(e.target.value)} maxLength={60} placeholder="Who should be called?" />
            <label htmlFor={`${uid}-ecp`}>Phone</label>
            <input id={`${uid}-ecp`} inputMode="numeric" value={ecPhone} onChange={(e) => setEcPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" />
            {ecError && <p className="error">{ecError}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" style={{ flex: 1 }}>{ec?.enabled ? "Update contact" : "Print on my card"}</button>
              {ec?.enabled && (
                <button type="button" className="ghost" style={{ flex: 1 }} onClick={(e) => saveEmergency(e, false)}>
                  Remove
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="sheet-section">
        <span className="sheet-label">If your card was shared by mistake</span>
        <button type="button" className="ghost" style={{ width: "100%" }} onClick={onRegenerate}>
          Create a new card ID &amp; QR
        </button>
        <p className="switch-hint" style={{ marginTop: 8 }}>The old ID and QR code stop working straight away.</p>
      </div>

      <button type="button" style={{ width: "100%", marginTop: 24, minHeight: 48 }} onClick={onClose}>
        Done
      </button>
    </Sheet>
  );
}
