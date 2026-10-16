import { useEffect, useState } from "react";
import { Droplet, ChevronRight } from "lucide-react";
import { api } from "../api";
import StatusPill from "../components/StatusPill";
import Skeleton from "../components/Skeleton";
import SegmentedControl from "../components/SegmentedControl";
import { StaggerList, MLink, staggerItem } from "../motion/kit";

export default function MyRequestsPage() {
  const [requests, setRequests] = useState(null);
  const [tab, setTab] = useState("active");

  useEffect(() => {
    api
      .get("/api/requests/me")
      .then((d) => setRequests(d.requests))
      .catch(() => setRequests([]));
  }, []);

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
                    {r.bloodGroup} · {r.units} unit(s) · {r.area}
                  </div>
                  <div className="row-sub">{r.hospital}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <StatusPill status={r.status} />
                <ChevronRight size={16} color="var(--text-soft)" />
              </div>
            </MLink>
            ))}
          </StaggerList>
        )}
      </div>
    </div>
  );
}
