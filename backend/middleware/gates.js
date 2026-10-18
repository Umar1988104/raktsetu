// v1.8 gates. Plain functions (not Express middleware) because the route
// handlers already load the user. Each returns null when the person may
// continue, or { status, body } to send straight back.

// Anyone who becomes discoverable or contactable (donor profile, "available",
// accepting a request) or acts as a hospital must have a verified email. This
// stops fake-account spam. Raising a blood request is NOT gated — in an
// emergency nobody should be blocked by an inbox.
function emailGate(req) {
  if (req.user && req.user.emailVerified) return null;
  return {
    status: 403,
    body: {
      error: "Please verify your email first — we sent you a link. Check your inbox (and spam), then try again.",
      code: "EMAIL_NOT_VERIFIED",
    },
  };
}

// Hospital powers (verifying requests/donors, looking up cards, posting camps)
// need an admin-approved hospital account on top of a verified email. Anyone
// can register as a "hospital", so self-declaration alone is never enough.
function hospitalGate(req, user) {
  if (!user || user.role !== "hospital") {
    return { status: 403, body: { error: "Only hospital accounts can do this" } };
  }
  const email = emailGate(req);
  if (email) return email;
  if (!user.partnerVerified) {
    return {
      status: 403,
      body: {
        error: "Your hospital account is waiting for admin approval. You'll get access to these tools once an admin has checked your hospital.",
        code: "HOSPITAL_NOT_APPROVED",
      },
    };
  }
  return null;
}

const send = (res, gate) => res.status(gate.status).json(gate.body);

module.exports = { emailGate, hospitalGate, send };
