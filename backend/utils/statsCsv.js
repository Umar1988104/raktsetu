// Anonymous statistics export for reports (v1.8). Counts only — no names,
// phones, emails, locations or ids. Any group smaller than 5 is shown as "<5"
// so a tiny group can't point at an individual.
const MIN_GROUP = 5;

const suppress = (n) => (n < MIN_GROUP ? "<5" : String(n));
const csvCell = (v) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// sections: [{ section, rows: [{ label, count }] }]
function buildStatsCsv(sections, generatedAt = new Date()) {
  const lines = ["section,label,count"];
  for (const { section, rows } of sections) {
    for (const { label, count } of rows) lines.push([section, label, suppress(count)].map(csvCell).join(","));
  }
  lines.push(`meta,generated,${generatedAt.toISOString().slice(0, 10)}`);
  lines.push(`meta,note,"Counts under ${MIN_GROUP} are shown as <${MIN_GROUP} to protect privacy"`);
  return lines.join("\n") + "\n";
}

module.exports = { buildStatsCsv, suppress, MIN_GROUP };
