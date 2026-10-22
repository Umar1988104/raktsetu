// Card-to-detail motion (v2.0), done without any router feature: when a list
// row is opened we remember where its title was on screen; the detail page
// then lets its heading glide from that spot into place. Only transform and
// opacity animate, and nothing happens for people who prefer reduced motion.
const KEY = "raktsetu_flip";

export function rememberRow(id, el) {
  try {
    const r = el.getBoundingClientRect();
    sessionStorage.setItem(KEY, JSON.stringify({ id, top: r.top, left: r.left, at: Date.now() }));
  } catch {
    /* motion is optional */
  }
}

export function playFlipIn(id, el) {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw || !el || typeof el.animate !== "function") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const from = JSON.parse(raw);
    if (from.id !== id || Date.now() - from.at > 4000) return;
    const to = el.getBoundingClientRect();
    const dy = from.top - to.top;
    const dx = from.left - to.left;
    if (Math.abs(dy) > 700 || (Math.abs(dy) < 2 && Math.abs(dx) < 2)) return;
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(0.97)`, opacity: 0.55 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 420, easing: "cubic-bezier(0.32, 0.72, 0, 1)" }
    );
  } catch {
    /* motion is optional */
  }
}
