import { PlusCircle, CalendarClock, Send, BadgeCheck, Megaphone, HeartHandshake, RefreshCw, CheckCircle2, Hourglass, Radio } from "lucide-react";

// The journey of a request, newest at the bottom, using the REAL times each
// thing happened (v2.0). Nothing here is invented: if nothing has happened
// yet, the timeline just says so.
const META = {
  created: { icon: PlusCircle, label: "Request created" },
  scheduled: { icon: CalendarClock, label: "Scheduled for later" },
  released: { icon: Send, label: "Donors are now being contacted" },
  "hospital-verified": { icon: BadgeCheck, label: "Confirmed by a hospital partner" },
  notified: { icon: Megaphone, label: "Donors notified" },
  escalated: { icon: Megaphone, label: "Search widened" },
  accepted: { icon: HeartHandshake, label: "A donor accepted" },
  extended: { icon: RefreshCw, label: "You said you still need blood" },
  fulfilled: { icon: CheckCircle2, label: "Fulfilled" },
  expired: { icon: Hourglass, label: "Request closed" },
};

function relative(date, now = Date.now()) {
  const mins = Math.round((now - new Date(date).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const clock = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function RequestTimeline({ request }) {
  const events = request.timeline || [];
  const open = ["Searching", "Contacted", "Confirmed"].includes(request.status) && !request.lifecycle?.scheduled;
  return (
    <div className="card">
      <h3>Journey of this request</h3>
      <ol className="journey" aria-label="Request timeline">
        {events.map((e, i) => {
          const M = META[e.type] || META.created;
          const Icon = M.icon;
          return (
            <li key={`${e.type}-${i}`} className={`journey-item type-${e.type}`}>
              <span className="journey-icon"><Icon size={16} aria-hidden="true" /></span>
              <div>
                <div className="journey-title">{M.label}</div>
                {e.detail && <div className="journey-detail">{e.detail}</div>}
                <div className="journey-time"><time dateTime={new Date(e.at).toISOString()}>{clock(e.at)}</time> · {relative(e.at)}</div>
              </div>
            </li>
          );
        })}
        {open && (
          <li className="journey-item journey-live" aria-live="polite">
            <span className="journey-icon"><Radio size={16} aria-hidden="true" /></span>
            <div>
              <div className="journey-title"><span className="live-dot" /> Waiting for the next step</div>
              <div className="journey-detail">This page updates by itself.</div>
            </div>
          </li>
        )}
      </ol>
    </div>
  );
}
