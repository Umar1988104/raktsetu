import { useEffect, useState } from "react";

// Counts up from 0 to `value` on first show. Skips the animation entirely for
// anyone whose system asks for reduced motion, and passes non-numbers (like
// the "—" placeholder while data loads) straight through.
export default function AnimatedNumber({ value, duration = 800 }) {
  const [display, setDisplay] = useState(typeof value === "number" ? 0 : value);

  useEffect(() => {
    if (typeof value !== "number") {
      setDisplay(value);
      return;
    }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || value === 0) {
      setDisplay(value);
      return;
    }
    let raf;
    let start;
    const step = (ts) => {
      if (start === undefined) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3)))); // ease-out
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{typeof display === "number" ? display.toLocaleString("en-IN") : display}</>;
}
