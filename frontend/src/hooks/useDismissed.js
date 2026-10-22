import { useState, useCallback } from "react";

// Items a person has swiped away in a list (v2.0). Stored only in this
// browser; it never changes anything on the server.
export default function useDismissed(name) {
  const key = `raktsetu_dismissed_${name}`;
  const [ids, setIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return new Set(); }
  });
  const save = (set) => {
    try { localStorage.setItem(key, JSON.stringify([...set].slice(-300))); } catch { /* fine */ }
  };
  const dismiss = useCallback((id) => setIds((prev) => { const n = new Set(prev).add(id); save(n); return n; }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const restoreAll = useCallback(() => { save(new Set()); setIds(new Set()); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return { dismissed: ids, dismiss, restoreAll };
}
