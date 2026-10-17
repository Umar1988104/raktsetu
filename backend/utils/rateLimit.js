// Tiny in-memory sliding-window limiter (no extra service, free hosting
// friendly). State resets when the server restarts or sleeps — good enough to
// stop casual guessing; it is not a substitute for the unguessable card IDs.
function createLimiter({ windowMs, max, maxKeys = 5000 }) {
  const hits = new Map(); // key -> array of timestamps

  function prune(now) {
    for (const [k, arr] of hits) {
      const fresh = arr.filter((t) => now - t < windowMs);
      if (fresh.length) hits.set(k, fresh);
      else hits.delete(k);
    }
  }

  return {
    // Counts one attempt for `key`. Returns { allowed, retryAfterSec }.
    hit(key, now = Date.now()) {
      if (hits.size > maxKeys) prune(now);
      const fresh = (hits.get(key) || []).filter((t) => now - t < windowMs);
      if (fresh.length >= max) {
        hits.set(key, fresh);
        return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - fresh[0])) / 1000)) };
      }
      fresh.push(now);
      hits.set(key, fresh);
      return { allowed: true, retryAfterSec: 0 };
    },
    // Counts without blocking (used to record failed lookups).
    peek(key, now = Date.now()) {
      const fresh = (hits.get(key) || []).filter((t) => now - t < windowMs);
      return fresh.length >= max;
    },
    reset() { hits.clear(); },
  };
}

module.exports = { createLimiter };
