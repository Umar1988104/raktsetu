import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

// Display preferences: theme (system / light / dark), high contrast, text size.
// Stored ONLY in this browser (localStorage) — never sent to the server.
// index.html applies the saved values before React loads so there is no flash.
const KEY = "raktsetu_prefs";
const DEFAULTS = { theme: "system", contrast: "normal", textSize: "normal" };
const THEMES = ["system", "light", "dark"];
const CONTRASTS = ["normal", "high"];
const SIZES = ["normal", "large", "xlarge"];

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      theme: THEMES.includes(raw.theme) ? raw.theme : DEFAULTS.theme,
      contrast: CONTRASTS.includes(raw.contrast) ? raw.contrast : DEFAULTS.contrast,
      textSize: SIZES.includes(raw.textSize) ? raw.textSize : DEFAULTS.textSize,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

const systemDark = () => !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;

export function applyPrefs(prefs, root = document.documentElement) {
  const dark = prefs.theme === "dark" || (prefs.theme === "system" && systemDark());
  root.setAttribute("data-theme", dark ? "dark" : "light");
  if (prefs.contrast === "high") root.setAttribute("data-contrast", "high");
  else root.removeAttribute("data-contrast");
  if (prefs.textSize !== "normal") root.setAttribute("data-text", prefs.textSize);
  else root.removeAttribute("data-text");

  // Colour of the phone's status bar / browser chrome
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#07090E" : "#E4E9F3");
}

const PrefsContext = createContext({
  ...DEFAULTS,
  setTheme: () => {},
  setContrast: () => {},
  setTextSize: () => {},
  reset: () => {},
});

export function PrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(read);

  useEffect(() => {
    applyPrefs(prefs);
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* storage unavailable — the choice just won't persist */
    }
  }, [prefs]);

  // While on "System", follow the device when it flips between light and dark.
  useEffect(() => {
    if (prefs.theme !== "system" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyPrefs(prefs);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [prefs]);

  const setTheme = useCallback((theme) => setPrefs((p) => ({ ...p, theme })), []);
  const setContrast = useCallback((contrast) => setPrefs((p) => ({ ...p, contrast })), []);
  const setTextSize = useCallback((textSize) => setPrefs((p) => ({ ...p, textSize })), []);
  const reset = useCallback(() => setPrefs({ ...DEFAULTS }), []);

  const value = useMemo(
    () => ({ ...prefs, setTheme, setContrast, setTextSize, reset }),
    [prefs, setTheme, setContrast, setTextSize, reset]
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export const usePrefs = () => useContext(PrefsContext);
