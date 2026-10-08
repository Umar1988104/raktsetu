import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Droplet, ChevronRight } from "lucide-react";
import { api } from "../api";
import StatusPill from "../components/StatusPill";
import Skeleton from "../components/Skeleton";

export default function MyRequestsPage() {
  const [requests, setRequests] = useState(null);
  const [tab, setTab] = useState("active");

  useEffect(() => {
    api
      .get("/api/requests/me")
      .then((d) => setRequests(d.requests))
      .catch(() => setRequests([]));
  }, []);

  const filtered = (requests || []).filter((r) =>
    tab === "active" ? !["Fulfilled", "Expired"].includes(r.status) : ["Fulfilled", "Expired"].includes(r.status)
  );

  return (
    <div>
      <div className="page-header">
        <h1>My requests</h1>
        <p>View and manage your blood requests.</p>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === "active" ? "active" : ""}`} onClick={() => setTab("active")}>
          Active
        </button>
        <button className={`tab ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
          History
        </button>
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
          filtered.map((r) => (
            <Link key={r._id} to={`/requests/${r._id}`} className="list-row" style={{ color: "inherit" }}>
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
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <StatusPill status={r.status} />
                <ChevronRight size={16} color="var(--text-soft)" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
