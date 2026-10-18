const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");

// v1.8 server protection (both packages are free).
// Limits are per IP and kept in memory: they reset if the free server
// restarts or sleeps. They exist to stop password guessing, spam and scripts
// hammering the API — not to replace the real protections (login, tokens).
const tooMany = (message) => (req, res) => res.status(429).json({ error: message });

function makeLimiter({ windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7", // RateLimit headers so well-behaved clients can back off
    legacyHeaders: false,
    handler: tooMany(message),
  });
}

const limiters = {
  // Everything under /api: generous, because the app refreshes data often.
  general: () => makeLimiter({ windowMs: 15 * 60e3, limit: 900, message: "Too many requests. Please wait a few minutes and try again." }),
  // Creating accounts / profiles: someone making dozens is not a person.
  signup: () => makeLimiter({ windowMs: 60 * 60e3, limit: 20, message: "Too many sign-up attempts from this connection. Please try again later." }),
  // New blood requests: generous (emergencies), but not unlimited.
  newRequest: () => makeLimiter({ windowMs: 60 * 60e3, limit: 40, message: "Too many requests created from this connection. Please try again later." }),
};

// Call once on the Express app, before the routes.
function applySecurity(app, { env = process.env } = {}) {
  // Behind Render/Vercel/etc. the real client IP is in X-Forwarded-For. Leave
  // as "loopback" locally; set TRUST_PROXY=1 when deployed behind one proxy.
  const tp = env.TRUST_PROXY;
  app.set("trust proxy", tp === undefined || tp === "" ? "loopback" : /^\d+$/.test(tp) ? Number(tp) : tp);
  app.disable("x-powered-by");
  app.use(
    helmet({
      // The frontend lives on another origin and calls this API with CORS.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
}

module.exports = { applySecurity, limiters, makeLimiter };
