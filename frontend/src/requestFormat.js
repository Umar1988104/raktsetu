// Small helpers for showing a request consistently (v1.9: component + planned date).
export const COMPONENT_LABEL = { "Whole blood": "Blood", Platelets: "Platelets", Plasma: "Plasma" };

// "B+ Platelets · 2 unit(s)" — blood stays plain "B+".
export function requestHeadline(r) {
  const part = r.component && r.component !== "Whole blood" ? ` ${r.component}` : "";
  return `${r.bloodGroup}${part} · ${r.units} unit(s)`;
}

export function formatNeededBy(date) {
  if (!date) return "";
  return new Date(date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

// Status to SHOW: a planned request not yet released reads "Scheduled".
export const displayStatus = (r) => (r.lifecycle?.scheduled ? "Scheduled" : r.status);

// Builds a datetime-local string ("2026-10-20T14:30") N hours from now, in local time.
export function localInputValue(hoursFromNow = 0) {
  const d = new Date(Date.now() + hoursFromNow * 3600e3);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
