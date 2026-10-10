import { Phone } from "lucide-react";
import { useLang } from "../i18n";

// Real, always-correct numbers: 112 is India's single national emergency
// number and 108 is the emergency ambulance line in most states. On a phone,
// tapping opens the dialer immediately — so someone can call for help while
// the request form is still open (and even while it submits).
export default function EmergencyCallButtons() {
  const { t } = useLang();
  return (
    <div
      style={{
        border: "1px solid var(--primary)",
        background: "var(--primary-soft)",
        borderRadius: 12,
        padding: "12px 14px",
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--primary-dark)", marginBottom: 8 }}>
        {t("Call for help now")}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a href="tel:112">
          <button type="button">
            <Phone size={14} /> {t("Call 112 (emergency)")}
          </button>
        </a>
        <a href="tel:108">
          <button type="button" className="ghost">
            <Phone size={14} /> {t("Call 108 (ambulance)")}
          </button>
        </a>
      </div>
    </div>
  );
}
