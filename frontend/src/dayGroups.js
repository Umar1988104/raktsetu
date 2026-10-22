// Groups items under "Today", "Yesterday" and dates, newest first (v2.0).
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function dayLabel(date, now = new Date()) {
  const diff = Math.round((startOfDay(now) - startOfDay(new Date(date))) / 86400e3);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function groupByDay(items, getDate, now = new Date()) {
  const sorted = [...items].sort((a, b) => new Date(getDate(b)) - new Date(getDate(a)));
  const groups = [];
  for (const item of sorted) {
    const label = dayLabel(getDate(item), now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}
