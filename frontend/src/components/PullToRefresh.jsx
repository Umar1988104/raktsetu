import { useEffect, useRef, useState } from "react";
import * as m from "motion/react-m";
import { RefreshCw } from "lucide-react";
import { useRefreshContext } from "../context/RefreshContext";

const TRIGGER = 90; // px of pull needed
const MAX = 120;

// Pull down from the top of a page on a touch screen to refresh it (v2.0).
// Only the little indicator moves (transform + opacity). Does nothing unless
// the current page registered a refresh handler.
export default function PullToRefresh() {
  const { handlerRef } = useRefreshContext();
  const [pull, setPull] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const start = useRef(null);

  useEffect(() => {
    const onStart = (e) => {
      if (!handlerRef.current || spinning || window.scrollY > 0 || e.touches.length !== 1) return;
      if (document.documentElement.hasAttribute("data-sheet")) return;
      start.current = { y: e.touches[0].clientY, x: e.touches[0].clientX };
    };
    const onMove = (e) => {
      if (!start.current) return;
      const dy = e.touches[0].clientY - start.current.y;
      const dx = Math.abs(e.touches[0].clientX - start.current.x);
      if (dy <= 0 || dx > dy) { setPull(0); return; }
      if (window.scrollY > 0) { start.current = null; setPull(0); return; }
      setPull(Math.min(MAX, dy * 0.5));
    };
    const onEnd = async () => {
      if (!start.current) return;
      const reached = pull >= TRIGGER * 0.5;
      start.current = null;
      if (reached && handlerRef.current) {
        setSpinning(true);
        setPull(TRIGGER * 0.5);
        try { await handlerRef.current(); } catch { /* the page shows its own errors */ }
        setTimeout(() => { setSpinning(false); setPull(0); }, 350);
      } else {
        setPull(0);
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [handlerRef, pull, spinning]);

  return (
    <m.div className={`ptr ${spinning ? "spinning" : ""}`} aria-hidden="true" animate={{ y: pull, opacity: pull > 8 ? 1 : 0, rotate: spinning ? 0 : pull * 3 }} transition={{ type: "spring", stiffness: 500, damping: 40 }}>
      <RefreshCw size={18} />
    </m.div>
  );
}
