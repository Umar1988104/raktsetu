import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  Droplet, Users, HeartHandshake, CheckCircle2, Siren, PlusCircle, Tent, Bell, UserRound,
  ShieldCheck, Sparkles, Lightbulb, ArrowRight, CalendarDays, Accessibility,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { useLang } from "../i18n";
import StatusPill from "../components/StatusPill";
import AnimatedNumber from "../components/AnimatedNumber";
import { CHANGELOG } from "../data/changelog";
import { TIPS } from "../data/tips";

const CHART_COLORS = ["#E6364A", "#F5A623", "#2F80ED", "#8B5CF6", "#16A34A", "#0EA5B7", "#D946EF", "#64748B"];
const TIER_CLASS = { New: "pill-expired", Trusted: "pill-confirmed", Pillar: "pill-verified" };

export default function Dashboard() {
  const { profile } = useAuth();
  const { t } = useLang();
  const role = profile?.user?.role;

  const [stats, setStats] = useState(null);
  const [camps, setCamps] = useState(null);
  const [requests, setRequests] = useState([]); // seeker
  const [donors, setDonors] = useState(null); // donor profiles
  const [pendingForMe, setPendingForMe] = useState(null); // donor: requests awaiting their answer
  const [pendingVerify, setPendingVerify] = useState(null); // hospital: Critical requests awaiting verification

  useEffect(() => {
    api.get("/api/stats").then(setStats).catch(() => {});
    api.get("/api/camps").then((d) => setCamps(d.camps.slice(0, 3))).catch(() => setCamps([]));

    if (role === "seeker") {
      api.get("/api/requests/me").then((d) => setRequests(d.requests)).catch(() => {});
    }
    if (role === "donor") {
      api.get("/api/donors/me").then((d) => setDonors(d.donors)).catch(() => setDonors([]));
      api
        .get("/api/donors/me/incoming-requests")
        .then((d) => setPendingForMe(d.incoming.filter((i) => i.myResponse === "Pending").length))
        .catch(() => setPendingForMe(0));
    }
    if (role === "hospital") {
      api
        .get("/api/requests/pending-verification")
        .then((d) => setPendingVerify(d.requests.length))
        .catch(() => setPendingVerify(0));
    }
  }, [role]);

  const chartData = stats?.byBloodGroup
    ? Object.entries(stats.byBloodGroup).map(([group, count]) => ({ name: group, value: count }))
    : [];

  // Counts use ALL of the seeker's requests; only the list below is trimmed.
  const activeCount = requests.filter((r) => !["Fulfilled", "Expired"].includes(r.status)).length;
  const fulfilledCount = requests.filter((r) => r.status === "Fulfilled").length;
  const recent = requests.slice(0, 5);

  const tip = TIPS[Math.floor(Date.now() / 86400000) % TIPS.length]; // changes once a day

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1>
            {t("Welcome back,")} {profile?.user?.name?.split(" ")[0] || ""}
          </h1>
          <p>{t("Here's what's happening across RaktSetu right now.")}</p>
        </div>
        <HeaderAction role={role} t={t} />
      </div>

      <LiveStrip stats={stats} t={t} />

      <RecurringCareReminders familyMembers={profile?.user?.familyMembers} />

      <div className="stat-grid">
        {role === "seeker" ? (
          <>
            <StatCard icon={<Droplet size={18} />} color="orange" value={activeCount} label="Active requests" />
            <StatCard icon={<Users size={18} />} color="green" value={stats?.availableDonors ?? "—"} label="Available donors" />
            <StatCard icon={<HeartHandshake size={18} />} color="blue" value={stats?.totalDonors ?? "—"} label="Total donors" />
            <StatCard icon={<CheckCircle2 size={18} />} color="purple" value={fulfilledCount} label="Your fulfilled requests" />
          </>
        ) : (
          <>
            <StatCard icon={<Droplet size={18} />} color="orange" value={stats?.totalRequests ?? "—"} label="Total requests on RaktSetu" />
            <StatCard icon={<Users size={18} />} color="green" value={stats?.availableDonors ?? "—"} label="Donors available now" />
            <StatCard icon={<HeartHandshake size={18} />} color="blue" value={stats?.totalDonors ?? "—"} label="Total registered donors" />
            <StatCard icon={<CheckCircle2 size={18} />} color="purple" value={stats?.fulfilledRequests ?? "—"} label="Requests fulfilled" />
          </>
        )}
      </div>

      <p className="section-title">{t("Quick actions")}</p>
      <QuickActions role={role} t={t} />

      <div className="two-col">
        <div>
          {role === "seeker" && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>{t("Recent requests")}</h3>
                {requests.length > 0 && (
                  <Link to="/requests" style={{ fontSize: "0.82rem" }}>
                    {t("View all")} <ArrowRight size={12} style={{ verticalAlign: "middle" }} />
                  </Link>
                )}
              </div>
              {recent.length === 0 ? (
                <div className="empty-state">
                  <Droplet size={26} className="empty-icon" />
                  <p>No requests yet.</p>
                  <Link to="/requests/new" className="btn-primary" style={{ marginTop: 10 }}>
                    Create your first request
                  </Link>
                </div>
              ) : (
                recent.map((r) => (
                  <Link key={r._id} to={`/requests/${r._id}`} className="list-row" style={{ color: "inherit" }}>
                    <div className="list-row-main">
                      <div className="row-icon" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                        <Droplet size={16} />
                      </div>
                      <div>
                        <div className="row-title">
                          {r.bloodGroup} · {r.units} unit(s)
                        </div>
                        <div className="row-sub">{r.hospital}</div>
                      </div>
                    </div>
                    <StatusPill status={r.status} />
                  </Link>
                ))
              )}
            </div>
          )}

          {role === "donor" && (
            <>
              <PendingForMeCard count={pendingForMe} t={t} />
              <DonorStatusCard donors={donors} t={t} />
            </>
          )}

          {role === "hospital" && <PendingVerifyCard count={pendingVerify} t={t} />}
        </div>

        <div className="card">
          <h3>{t("Blood group availability")}</h3>
          {chartData.length === 0 ? (
            <p className="empty-note">No donor data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "0.78rem" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="two-col">
        <CampsPreview camps={camps} role={role} t={t} />
        <WhatsNew t={t} />
      </div>

      <div className="tip-card">
        <div className="tip-icon">
          <Lightbulb size={18} />
        </div>
        <div>
          <strong style={{ fontSize: "0.85rem" }}>{t("Did you know?")}</strong>
          <p>{tip}</p>
          <p className="tip-note">General information — the blood bank's staff always make the final eligibility decision.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- pieces ---------------- */

function HeaderAction({ role, t }) {
  if (role === "seeker") {
    return (
      <Link to="/requests/new?sos=1" className="btn-primary">
        <Siren size={15} /> {t("SOS — Request Now")}
      </Link>
    );
  }
  if (role === "donor") {
    return (
      <Link to="/notifications" className="btn-primary">
        <Bell size={15} /> {t("Notifications")}
      </Link>
    );
  }
  if (role === "hospital") {
    return (
      <Link to="/verify" className="btn-primary">
        <ShieldCheck size={15} /> {t("Verify Requests")}
      </Link>
    );
  }
  return null;
}

// Real numbers from the database — what's happening on the platform right now.
function LiveStrip({ stats, t }) {
  if (!stats) return null;
  return (
    <div className="live-strip">
      <span className="live-label">
        <span className="live-dot" aria-hidden="true" />
        {t("Live now")}
      </span>
      <span className="live-item">
        <strong>
          <AnimatedNumber value={stats.openRequests ?? 0} />
        </strong>
        {t("open requests")}
      </span>
      <span className="live-item critical">
        <strong>
          <AnimatedNumber value={stats.criticalOpen ?? 0} />
        </strong>
        {t("Critical")}
      </span>
      <span className="live-item">
        <strong>
          <AnimatedNumber value={stats.availableDonors ?? 0} />
        </strong>
        {t("donors available now")}
      </span>
    </div>
  );
}

function QuickActions({ role, t }) {
  const sets = {
    seeker: [
      { to: "/requests/new?sos=1", icon: <Siren size={18} />, title: "SOS — Request Now", desc: "Fastest way to ask for blood", emphasis: true },
      { to: "/requests/new", icon: <PlusCircle size={18} />, title: "New Request", desc: "Add full details", color: "orange" },
      { to: "/donors", icon: <Users size={18} />, title: "Donor Network", desc: "See who's nearby", color: "green" },
      { to: "/camps", icon: <Tent size={18} />, title: "Donation Camps", desc: "Upcoming drives", color: "blue" },
    ],
    donor: [
      { to: "/notifications", icon: <Bell size={18} />, title: "Notifications", desc: "Requests matched to you", emphasis: true },
      { to: "/profile", icon: <UserRound size={18} />, title: "Profile", desc: "Availability & eligibility", color: "green" },
      { to: "/camps", icon: <Tent size={18} />, title: "Donation Camps", desc: "Find a drive to attend", color: "blue" },
      { to: "/updates", icon: <Sparkles size={18} />, title: "What's new", desc: "Latest improvements", color: "purple" },
    ],
    hospital: [
      { to: "/verify", icon: <ShieldCheck size={18} />, title: "Verify Requests", desc: "Release Critical requests", emphasis: true },
      { to: "/camps", icon: <Tent size={18} />, title: "Donation Camps", desc: "Post and manage camps", color: "blue" },
      { to: "/profile", icon: <UserRound size={18} />, title: "Profile", desc: "Your partner details", color: "green" },
      { to: "/updates", icon: <Sparkles size={18} />, title: "What's new", desc: "Latest improvements", color: "purple" },
    ],
  };

  return (
    <div className="quick-grid">
      {(sets[role] || []).map((a) => (
        <Link key={a.to + a.title} to={a.to} className={`quick-tile ${a.emphasis ? "emphasis" : ""}`}>
          <div
            className="quick-icon"
            style={!a.emphasis ? { background: `var(--${a.color}-soft)`, color: `var(--${a.color})` } : undefined}
          >
            {a.icon}
          </div>
          <strong>{t(a.title)}</strong>
          <span>{t(a.desc)}</span>
        </Link>
      ))}
    </div>
  );
}

function PendingForMeCard({ count, t }) {
  return (
    <div className="card">
      <h3>{t("Waiting for your response")}</h3>
      {count === null ? (
        <p className="status" style={{ margin: 0 }}>Checking…</p>
      ) : count === 0 ? (
        <p style={{ color: "var(--text-soft)", fontSize: "0.9rem", margin: 0 }}>
          Nothing needs your answer right now. You'll be alerted as soon as a request matches you.
        </p>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "0.95rem" }}>
            <strong style={{ color: "var(--primary)", fontSize: "1.3rem" }}>{count}</strong>{" "}
            {count === 1 ? "request is" : "requests are"} waiting for you to accept or decline.
          </span>
          <Link to="/notifications" className="btn-primary">
            Respond
          </Link>
        </div>
      )}
    </div>
  );
}

function DonorStatusCard({ donors, t }) {
  return (
    <div className="card">
      <h3>{t("Your donor status")}</h3>
      {donors === null ? (
        <p className="status" style={{ margin: 0 }}>Loading…</p>
      ) : donors.length === 0 ? (
        <div className="empty-state" style={{ padding: "20px 0 8px" }}>
          <Droplet size={26} className="empty-icon" />
          <p>You haven't set up a donor profile yet.</p>
          <Link to="/profile" className="btn-primary" style={{ marginTop: 6 }}>
            Create your donor profile
          </Link>
        </div>
      ) : (
        donors.map((d) => (
          <div key={d._id} className="list-row">
            <div className="list-row-main">
              <div className="avatar">{(d.display?.name || "?")[0]?.toUpperCase()}</div>
              <div>
                <div className="row-title">
                  {d.display?.name} · {d.bloodGroup}
                </div>
                <div className="row-sub">
                  {d.nextEligibleDate
                    ? `Next eligible to donate: ${new Date(d.nextEligibleDate).toLocaleDateString()}`
                    : "Eligible to donate"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <span className={`pill ${d.available ? "pill-available" : "pill-unavailable"}`}>
                {d.available ? "Available" : "Not available"}
              </span>
              <span className={`pill ${TIER_CLASS[d.trustTier] || "pill-expired"}`}>{d.trustTier}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function PendingVerifyCard({ count, t }) {
  return (
    <div className="card">
      <h3>{t("Awaiting your verification")}</h3>
      {count === null ? (
        <p className="status" style={{ margin: 0 }}>Checking…</p>
      ) : count === 0 ? (
        <p style={{ color: "var(--text-soft)", fontSize: "0.9rem", margin: 0 }}>
          No Critical requests are waiting on your hospital right now.
        </p>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "0.95rem" }}>
            <strong style={{ color: "var(--primary)", fontSize: "1.3rem" }}>{count}</strong> Critical{" "}
            {count === 1 ? "request needs" : "requests need"} your verification before donors are notified.
          </span>
          <Link to="/verify" className="btn-primary">
            Review
          </Link>
        </div>
      )}
    </div>
  );
}

function CampsPreview({ camps, role, t }) {
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>{t("Upcoming camps")}</h3>
        <Link to="/camps" style={{ fontSize: "0.82rem" }}>
          {t("All camps")} <ArrowRight size={12} style={{ verticalAlign: "middle" }} />
        </Link>
      </div>
      {camps === null ? (
        <p className="status">Loading…</p>
      ) : camps.length === 0 ? (
        <div className="empty-state" style={{ padding: "24px 0 8px" }}>
          <Tent size={26} className="empty-icon" />
          <p>No upcoming camps posted yet.</p>
          {role === "hospital" && (
            <Link to="/camps" className="btn-primary" style={{ marginTop: 6 }}>
              Post a camp
            </Link>
          )}
        </div>
      ) : (
        camps.map((c) => (
          <div key={c._id} className="list-row">
            <div className="list-row-main">
              <div className="row-icon" style={{ background: "var(--blue-soft)", color: "var(--blue)" }}>
                <CalendarDays size={16} />
              </div>
              <div>
                <div className="row-title">{c.name}</div>
                <div className="row-sub">
                  {new Date(c.date).toLocaleDateString(undefined, { dateStyle: "medium" })} · {c.area} · {c.hospitalName}
                </div>
              </div>
            </div>
            {c.accessibility?.wheelchairRamp && (
              <span className="pill pill-verified" title="Wheelchair ramp available">
                <Accessibility size={11} style={{ marginRight: 4 }} />
                Accessible
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function WhatsNew({ t }) {
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{t("What's new")}</h3>
        <Link to="/updates" style={{ fontSize: "0.82rem" }}>
          {t("See all updates")} <ArrowRight size={12} style={{ verticalAlign: "middle" }} />
        </Link>
      </div>
      <ul className="timeline">
        {CHANGELOG.slice(0, 3).map((e) => (
          <li key={e.version}>
            <span className="tl-version">{e.version}</span>
            <span className="tl-title">{e.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecurringCareReminders({ familyMembers }) {
  const due = (familyMembers || [])
    .filter((m) => m.recurringCare?.conditionName && m.recurringCare?.lastTransfusionDate && m.recurringCare?.intervalDays)
    .map((m) => {
      const nextDue = new Date(m.recurringCare.lastTransfusionDate);
      nextDue.setDate(nextDue.getDate() + m.recurringCare.intervalDays);
      return { member: m, nextDue };
    })
    .filter((d) => d.nextDue <= new Date());

  if (due.length === 0) return null;

  return (
    <div className="availability-card" style={{ marginBottom: 20 }}>
      <span>
        <strong>{due.map((d) => d.member.name).join(", ")}</strong> {due.length === 1 ? "is" : "are"} due for a
        transfusion.
      </span>
      <Link to="/requests/new">
        <button>Create request</button>
      </Link>
    </div>
  );
}

function StatCard({ icon, color, value, label }) {
  const { t } = useLang();
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `var(--${color}-soft)`, color: `var(--${color})` }}>
        {icon}
      </div>
      <div className="stat-value">
        <AnimatedNumber value={value} />
      </div>
      <div className="stat-label">{t(label)}</div>
    </div>
  );
}
