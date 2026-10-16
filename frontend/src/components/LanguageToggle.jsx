import { useLang } from "../i18n";
import SegmentedControl from "./SegmentedControl";

// English | हिंदी as an iOS-style segmented control.
export default function LanguageToggle({ block = false }) {
  const { lang, setLang } = useLang();
  return (
    <SegmentedControl
      label="Language"
      block={block}
      value={lang}
      onChange={setLang}
      options={[
        { value: "en", label: "English" },
        { value: "hi", label: "हिंदी" },
      ]}
    />
  );
}
