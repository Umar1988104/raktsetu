export default function StatusPill({ status }) {
  return <span className={`pill pill-${status.toLowerCase()}`}>{status}</span>;
}

export function UrgencyPill({ urgency }) {
  const cls = urgency === "Critical" ? "pill-urgent" : urgency === "Urgent" ? "pill-high" : "pill-normal";
  return <span className={`pill ${cls}`}>{urgency}</span>;
}
