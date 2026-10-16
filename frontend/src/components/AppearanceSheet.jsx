import { useState, useId } from "react";
import { SunMoon, Sun, Moon, Monitor } from "lucide-react";
import Sheet from "./Sheet";
import SegmentedControl from "./SegmentedControl";
import Switch from "./Switch";
import LanguageToggle from "./LanguageToggle";
import { usePrefs } from "../prefs";
import { useLang } from "../i18n";

// Top-bar button + bottom sheet with theme, text size, contrast and language.
// Everything here is stored on this device only.
export default function AppearanceButton({ className = "icon-btn" }) {
  const [open, setOpen] = useState(false);
  const { t } = useLang();
  return (
    <>
      <button type="button" className={className} aria-label={t("Appearance")} onClick={() => setOpen(true)}>
        <SunMoon size={18} />
      </button>
      <AppearanceSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function AppearanceSheet({ open, onClose }) {
  const { theme, contrast, textSize, setTheme, setContrast, setTextSize } = usePrefs();
  const { t } = useLang();
  const uid = useId();
  const titleId = `${uid}-title`;
  const contrastId = `${uid}-contrast`;

  return (
    <Sheet open={open} onClose={onClose} labelledBy={titleId}>
      <h3 id={titleId}>{t("Appearance")}</h3>
      <p className="sheet-sub">{t("These settings are saved on this device only.")}</p>

      <div className="sheet-section">
        <span className="sheet-label">{t("Theme")}</span>
        <SegmentedControl
          block
          large
          label={t("Theme")}
          value={theme}
          onChange={setTheme}
          options={[
            { value: "system", label: t("Auto"), icon: <Monitor size={14} /> },
            { value: "light", label: t("Light"), icon: <Sun size={14} /> },
            { value: "dark", label: t("Dark"), icon: <Moon size={14} /> },
          ]}
        />
      </div>

      <div className="sheet-section">
        <span className="sheet-label">{t("Text size")}</span>
        <SegmentedControl
          block
          large
          label={t("Text size")}
          value={textSize}
          onChange={setTextSize}
          options={[
            { value: "normal", label: t("Default") },
            { value: "large", label: t("Large") },
            { value: "xlarge", label: t("Extra large") },
          ]}
        />
      </div>

      <div className="sheet-section">
        <div className="switch-row">
          <label htmlFor={contrastId} className="switch-text">
            <span className="switch-label">{t("High contrast")}</span>
            <span className="switch-hint">{t("Stronger text and borders for easier reading.")}</span>
          </label>
          <Switch id={contrastId} checked={contrast === "high"} onChange={(on) => setContrast(on ? "high" : "normal")} label={t("High contrast")} />
        </div>
      </div>

      <div className="sheet-section">
        <span className="sheet-label">{t("Language")}</span>
        <LanguageToggle block />
      </div>

      <p className="sheet-sub" style={{ marginTop: 24 }}>
        {t("Animations follow your device's \"reduce motion\" setting.")}
      </p>
      <button type="button" style={{ width: "100%", marginTop: 16, minHeight: 48 }} onClick={onClose}>
        {t("Done")}
      </button>
    </Sheet>
  );
}
