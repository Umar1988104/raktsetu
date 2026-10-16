import { useEffect, useState } from "react";
import { ShieldAlert, Users, Droplet, Ban } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { useConfirm, useToast } from "../components/UiFeedback";
import StatusPill from "../components/StatusPill";
import Skeleton from "../components/Skeleton";

// The server enforces admin access; this page just doesn't show itself to
// anyone else.
export default function AdminPage() {
  const { profile } = useAuth();
  const askConfirm = useConfirm();
  const toast = useToast();

  const [overview, setOverview] = useState(null);
  const [reported, setReported] = useState(null);
  const [throttled, setThrottled] = useState(null);
  const [busyId, setBusyId] = useState(null);

  async function load() {
    try {
      const [o, r, t] = await Promise.all([
        api.get("/api/admin/overview"),
        api.get("/api/admin/reported"),
        api.get("/api/admin/throttled"),
      ]);
      setOverview(o);
      setReported(r.requests);
      setThrottled(t.users);
    } catch (err) {
      toast(err.message, "error");
    }
  }

  useEffect(() => {
    if (profile?.isAdmin) load();
  }, [profile?.isAdmin]);

  async function act({ id, path, title, message, confirmLabel, done, tone }) {
    const ok = await askConfirm({ title, message, confirmLabel, tone });
    if (!ok) return;
    setBusyId(id);
    try {
      await api.post(path, {});
      toast(done, "success");
      await load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  if (!profile?.isAdmin) {
    return (
      <div className="card">
        <h3>Admins only</h3>
        <p style={{ color: "var(--text-soft)", margin: 0 }}>You don't have access to this page.</p>
      </div>
    );
  }

  const isOpen = (s) => ["Searching", "Contacted", "Confirmed"].includes(s);

  return (
    <div>
      <div className="page-header">
        <h1>Moderation</h1>
        <p>Review requests donors have reported, and lift blocks that were applied by mistake.</p>
      </div>

      {overview && (
        <div className="stat-grid">
          <Stat icon={<Users size={18} />} color="blue" value={overview.users.donors + overview.users.seekers + overview.users.hospitals} label="Accounts" />
          <Stat icon={<Droplet size={18} />} color="orange" value={overview.openRequests} label="Open requests" />
          <Stat icon={<ShieldAlert size={18} />} color="purple" value={overview.reportedRequests} label="Reported requests" />
          <Stat icon={<Ban size={18} />} color="green" value={overview.throttledUsers} label="Blocked accounts" />
        </div>
      )}

      <div className="card">
        <h3>Reported requests</h3>
        {reported === null ? (
          <Skeleton rows={3} />
        ) : reported.length === 0 ? (
          <p className="empty-note">Nothing has been reported.</p>
        ) : (
          reported.map((r) => (
            <div key={r._id} className="list-row" style={{ alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div className="row-title">
                  {r.bloodGroup} · {r.units} unit(s) · {r.urgency} · {r.hospital}
                </div>
                <div className="row-sub">
                  {r.reportCount} report{r.reportCount === 1 ? "" : "s"}
                  {r.closedReason ? ` · ${r.closedReason}` : ""} · raised by {r.seeker?.name || "unknown"}
                  {r.seeker?.phone ? ` (${r.seeker.phone})` : ""}
                  {r.seeker?.isGuest ? " · guest" : ""}
                </div>
                <div style={{ marginTop: 8 }}>
                  <StatusPill status={r.status} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="ghost"
                  disabled={busyId === r._id}
                  onClick={() =>
                    act({
                      id: r._id,
                      path: `/api/admin/requests/${r._id}/dismiss-reports`,
                      title: "Dismiss these reports?",
                      message: "The reports are cleared, the request is reopened if reports had closed it, and the requester's block is lifted.",
                      confirmLabel: "Dismiss reports",
                      done: "Reports dismissed.",
                    })
                  }
                >
                  Dismiss reports
                </button>
                {isOpen(r.status) && (
                  <button
                    disabled={busyId === r._id}
                    onClick={() =>
                      act({
                        id: r._id,
                        path: `/api/admin/requests/${r._id}/close`,
                        title: "Close this request?",
                        message: "Donors will stop being notified about it.",
                        confirmLabel: "Close request",
                        done: "Request closed.",
                        tone: "danger",
                      })
                    }
                  >
                    Close request
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h3>Blocked accounts</h3>
        {throttled === null ? (
          <Skeleton rows={2} />
        ) : throttled.length === 0 ? (
          <p className="empty-note">No accounts are currently blocked.</p>
        ) : (
          throttled.map((u) => (
            <div key={u._id} className="list-row">
              <div>
                <div className="row-title">
                  {u.name}
                  {u.isGuest && <span className="pill pill-expired" style={{ marginLeft: 8 }}>Guest</span>}
                </div>
                <div className="row-sub">
                  {u.phone} · blocked until {new Date(u.throttledUntil).toLocaleString()}
                </div>
              </div>
              <button
                className="ghost"
                disabled={busyId === u._id}
                onClick={() =>
                  act({
                    id: u._id,
                    path: `/api/admin/users/${u._id}/unthrottle`,
                    title: "Lift this block?",
                    message: `${u.name} will be able to create requests again straight away.`,
                    confirmLabel: "Lift block",
                    done: "Block lifted.",
                  })
                }
              >
                Lift block
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Stat({ icon, color, value, label }) {
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
