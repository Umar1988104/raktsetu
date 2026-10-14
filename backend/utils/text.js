// Escapes user text so it can be safely used inside a MongoDB $regex — stops
// someone typing regex syntax into a search box to slow down or break queries.
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { escapeRegex };
