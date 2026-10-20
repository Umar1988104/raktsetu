import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Droplet, ChevronRight, Repeat } from "lucide-react";
import { api } from "../api";
import StatusPill from "../components/StatusPill";
import Skeleton from "../components/Skeleton";
import SegmentedControl from "../components/SegmentedControl";
import Switch from "../components/Switch";
import { useAuth } from "../context/AuthContext";
import { useConfirm, useToast } from "../components/UiFeedback";
import { StaggerList, MLink, staggerItem } from "../motion/kit";
import { requestHeadline, formatNeededBy, displayStatus } from "../requestFormat";

export default function MyRequestsPage() {
  const [requests, setRequests] = useState(null);
  const [tab, setTab] = useState("active");
  const toast = useToast();
  const location = useLocation();
  const planCreated = !!location.state?.planCreated;

  useEffect(() => {
    api
      .get("/api/requests/me")
      .then((d) => setRequests(d.requests))
      .catch(() => setRequests([]));
  }, []);

  useEffect(() => {
    if (planCreated) toast("Repeating request saved. We'll create each request for you a week before it's due.", "success", 6000);
  }, [planCreated]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDone = (r) => ["Fulfilled", "Expired"].includes(r.status);
  const all = requests || [];
  const filtered = all.filter((r) => (tab === "active" ? !isDone(r) : isDone(r)));

  return (
    <div>
      <div className="page-header">
        <h1>My requests</h1>
        <p>View and manage your blood requests.</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <SegmentedControl
          label="Request list"
          value={tab}
          onChange={setTab}
          options={[
            { value: "active", label: "Active", count: requests ? all.filter((r) => !isDone(r)).length : undefined },
            { value: "history", label: "History", count: requests ? all.filter(isDone).length : undefined },
          ]}
        />
      </div>

      <div className="card">
        {requests === null ? (
          <Skeleton rows={3} />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Droplet size={26} className="empty-icon" />
            <p>No {tab === "active" ? "active" : "past"} requests.</p>
          </div>
        ) : (
          <StaggerList key={tab}>
            {filtered.map((r) => (
            <MLink key={r._id} variants={staggerItem} to={`/requests/${r._id}`} className="list-row" style={{ color: "inherit" }}>
              <div className="list-row-main">
                <div className="row-icon" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                  <Droplet size={16} />
                </div>
                <div>
                  <div className="row-title">
                    {requestHeadline(r)} · {r.area}
                  </div>
                  <div className="row-sub">
                    {r.hospital}
                    {r.neededBy && r.lifecycle?.scheduled ? ` · needed ${formatNeededBy(r.neededBy)}` : ""}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <StatusPill status={displayStatus(r)} />
                <ChevronRight size={16} color="var(--text-soft)" />
              </div>
            </MLink>
            ))}
          </StaggerList>
        )}
      </div>

      <RepeatingRequests />
    </div>
  );
}

// Repeating requests (v1.9): see, pause, skip or stop them.
function RepeatingRequests() {
  const { profile } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [plans, setPlans] = useState(null);

  useEffect(() => {
    if (profile?.user?.isGuest) return;
    api.get("/api/recurring").then((d) => setPlans(d.plans)).catch(() => setPlans([]));
  }, [profile?.user?.isGuest]);

  if (profile?.user?.isGuest || plans === null || plans.length === 0) return null;

  const patch = async (plan, body, okMsg) => {
    try {
      const d = await api.patch(`/api/recurring/${plan._id}`, body);
      setPlans((list) => list.map((p) => (p._id === plan._id ? d.plan : p)));
      if (okMsg) toast(okMsg, "success");
    } catch (err) {
      toast(err.message, "error");
    }
  };

  async function remove(plan) {
    const ok = await confirm({
      title: "Stop this repeating request?",
      message: "No new requests will be created from it. Requests it already made stay as they are.",
      confirmLabel: "Stop it",
      cancelLabel: "Keep it",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await api.del(`/api/recurring/${plan._id}`);
      setPlans((list) => list.filter((p) => p._id !== plan._id));
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <div className="card">
      <h3>
        <Repeat size={16} style={{ verticalAlign: "-2px", marginRight: 8 }} />
        Repeating requests
      </h3>
      {plans.map((p) => (
        <div key={p._id} className="plan-row">
          <div>
            <div className="row-title">
              {requestHeadline(p)} · {p.patientName}
            </div>
            <div className="row-sub">
              {p.hospital} · every {p.everyWeeks} {p.everyWeeks === 1 ? "week" : "weeks"}
              {p.active ? ` · next ${formatNeededBy(p.nextNeededAt)}` : " · paused"}
            </div>
          </div>
          <div className="plan-actions">
            <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{p.active ? "On" : "Paused"}</span>
            <Switch checked={p.active} onChange={(v) => patch(p, { active: v })} label={`Repeating request for ${p.patientName}`} />
            {p.active && (
              <button type="button" className="ghost" onClick={() => patch(p, { skipNext: true }, "Skipped the next one.")}>
                Skip next
              </button>
            )}
            <button type="button" className="ghost" onClick={() => remove(p)}>
              Stop
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
