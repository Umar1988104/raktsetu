import { Languages } from "lucide-react";
import { useLang } from "../i18n";

export default function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <button
      type="button"
      className="ghost"
      onClick={() => setLang(lang === "hi" ? "en" : "hi")}
      style={{ padding: "6px 12px", fontSize: "0.8rem" }}
      aria-label="Switch language"
    >
      <Languages size={14} /> {lang === "hi" ? "English" : "हिंदी"}
    </button>
  );
}
