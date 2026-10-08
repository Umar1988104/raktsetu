import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Droplet, Users, HeartHandshake, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import StatusPill from "../components/StatusPill";

const CHART_COLORS = ["#E6364A", "#F5A623", "#2F80ED", "#8B5CF6", "#16A34A", "#0EA5B7", "#D946EF", "#64748B"];

export default function Dashboard() {
  const { profile } = useAuth();
  const role = profile?.user?.role;
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    api.get("/api/stats").then(setStats).catch(() => {});
    if (role === "seeker") {
      api
        .get("/api/requests/me")
        .then((d) => setRequests(d.requests.slice(0, 5)))
        .catch(() => {});
    }
  }, [role]);

  const chartData = stats?.byBloodGroup
    ? Object.entries(stats.byBloodGroup).map(([group, count]) => ({ name: group, value: count }))
    : [];

  const activeCount = requests.filter((r) => !["Fulfilled", "Expired"].includes(r.status)).length;
  const fulfilledCount = requests.filter((r) => r.status === "Fulfilled").length;

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, {profile?.user?.name?.split(" ")[0] || "there"}</h1>
        <p>Here's what's happening across RaktSetu right now.</p>
      </div>

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

      <div className="two-col">
        <div>
          {role === "seeker" && (
            <div className="card">
              <h3>Recent requests</h3>
              {requests.length === 0 ? (
                <div className="empty-state">
                  <Droplet size={26} className="empty-icon" />
                  <p>No requests yet.</p>
                  <Link to="/requests/new" className="btn-primary" style={{ marginTop: 10 }}>
                    Create your first request
                  </Link>
                </div>
              ) : (
                requests.map((r) => (
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
            <div className="card">
              <h3>Thank you for being a donor</h3>
              <p style={{ color: "var(--text-soft)", fontSize: "0.92rem" }}>
                Keep your availability up to date on your Profile page so seekers nearby can find you
                when it matters most.
              </p>
              <Link to="/profile" className="btn-primary" style={{ marginTop: 6 }}>
                Go to your profile
              </Link>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Blood group availability</h3>
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
        <strong>
          {due.map((d) => d.member.name).join(", ")}
        </strong>{" "}
        {due.length === 1 ? "is" : "are"} due for a transfusion.
      </span>
      <Link to="/requests/new">
        <button>Create request</button>
      </Link>
    </div>
  );
}

function StatCard({ icon, color, value, label }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `var(--${color}-soft)`, color: `var(--${color})` }}>
        {icon}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
