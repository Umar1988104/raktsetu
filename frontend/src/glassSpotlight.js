// A soft light that follows the pointer across glass cards. Pure CSS variables
// (--mx / --my), one throttled listener, and only on devices that can hover and
// for people who have not asked for reduced motion.
const SELECTOR = ".card, .stat-card, .quick-tile, .live-strip, .persona-card, .compare-card, .how-step, .problem-card";

export function initGlassSpotlight() {
  if (typeof window === "undefined" || !window.matchMedia) return;
  if (!window.matchMedia("(hover: hover)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let raf = 0;
  let last = null;
  document.addEventListener(
    "pointermove",
    (e) => {
      last = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = last.target instanceof Element ? last.target.closest(SELECTOR) : null;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${last.clientX - r.left}px`);
        el.style.setProperty("--my", `${last.clientY - r.top}px`);
      });
    },
    { passive: true },
  );
}
