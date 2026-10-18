import { useEffect, useState } from "react";
import { ShieldAlert, Users, Droplet, Ban } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { useConfirm, useToast } from "../components/UiFeedback";
import StatusPill from "../components/StatusPill";
import Skeleton from "../components/Skeleton";
import Switch from "../components/Switch";

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

      <HospitalPartners />
      <AuditAndExport />

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

// Anyone can sign up as a hospital with any name, so "Verified Partner" on a
// card only appears after an admin has checked the hospital outside the app
// (call the number, check the website, ask for a document).
function HospitalPartners() {
  const askConfirm = useConfirm();
  const toast = useToast();
  const [hospitals, setHospitals] = useState(null);

  useEffect(() => {
    api.get("/api/admin/hospitals").then((d) => setHospitals(d.hospitals)).catch((err) => toast(err.message, "error"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function setVerified(h, verified) {
    const ok = await askConfirm({
      title: verified ? `Mark ${h.hospitalName || h.name} as a verified partner?` : "Remove verified-partner status?",
      message: verified
        ? "Their partner card will say “Verified Partner” and families will rely on it. Only do this after you have checked the hospital yourself."
        : "Their card will go back to “Pending verification”.",
      confirmLabel: verified ? "Mark verified" : "Remove",
      tone: verified ? "default" : "danger",
    });
    if (!ok) return;
    try {
      await api.patch(`/api/admin/hospitals/${h._id}/partner-verified`, { verified });
      setHospitals((list) => list.map((x) => (x._id === h._id ? { ...x, partnerVerified: verified } : x)));
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <div className="card">
      <h3>Hospital partners</h3>
      <p className="status" style={{ marginTop: 0, marginBottom: 16 }}>
        Anyone can register a hospital account. Verify one only after checking it outside the app.
      </p>
      {hospitals === null ? (
        <Skeleton rows={2} />
      ) : hospitals.length === 0 ? (
        <p className="empty-note">No hospital accounts yet.</p>
      ) : (
        hospitals.map((h) => (
          <div key={h._id} className="list-row">
            <div>
              <div className="row-title">{h.hospitalName || h.name}</div>
              <div className="row-sub">{h.name} · {h.phone}</div>
            </div>
            <div className="switch-row" style={{ gap: 8 }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Verified partner</span>
              <Switch checked={h.partnerVerified} onChange={(v) => setVerified(h, v)} label={`Verified partner: ${h.hospitalName || h.name}`} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Who did what (admin actions only) + an anonymous statistics download.
function AuditAndExport() {
  const toast = useToast();
  const [entries, setEntries] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/api/admin/audit").then((d) => setEntries(d.entries)).catch((err) => toast(err.message, "error"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function downloadStats() {
    setBusy(true);
    try {
      const csv = await api.getText("/api/admin/stats-export");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "raktsetu-stats.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      api.get("/api/admin/audit").then((d) => setEntries(d.entries)).catch(() => {});
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Admin action log</h3>
        <button type="button" className="ghost" onClick={downloadStats} disabled={busy}>
          Download anonymous stats (CSV)
        </button>
      </div>
      <p className="status" style={{ marginTop: 0 }}>Counts only. Any group smaller than 5 is shown as “&lt;5”. The log keeps no personal details and is deleted after a year.</p>
      {entries === null ? (
        <Skeleton rows={2} />
      ) : entries.length === 0 ? (
        <p className="empty-note">No admin actions yet.</p>
      ) : (
        entries.slice(0, 20).map((e) => (
          <div key={e._id} className="audit-row">
            <span>{e.summary || e.action}</span>
            <span className="row-time">{new Date(e.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        ))
      )}
    </div>
  );
}
