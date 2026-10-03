import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Check, X, Droplet } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";

export default function NotificationsPage() {
  const { profile } = useAuth();
  const role = profile?.user?.role;
  return role === "donor" ? <DonorInbox /> : <SeekerFeed />;
}

function DonorInbox() {
  const [incoming, setIncoming] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  function load() {
    api
      .get("/api/donors/me/incoming-requests")
      .then((d) => setIncoming(d.incoming))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function respond(requestId, response) {
    setBusyId(requestId);
    try {
      await api.post(`/api/requests/${requestId}/respond`, { response });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Notifications</h1>
        <p>Requests that matched your blood group and location.</p>
      </div>

      <div className="card">
        {error && <p className="error">{error}</p>}
        {!incoming ? (
          <p className="loading">Loading...</p>
        ) : incoming.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">
              <Bell size={30} style={{ margin: "0 auto" }} />
            </div>
            <p>No requests have matched you yet.</p>
            <p style={{ fontSize: "0.82rem", marginTop: 4 }}>
              Make sure your profile is marked "Available" — that's how you show up in matching.
            </p>
          </div>
        ) : (
          incoming.map((r) => (
            <div key={r.requestId} className="list-row" style={{ alignItems: "flex-start" }}>
              <div className="list-row-main">
                <div className="row-icon" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                  <Droplet size={16} />
                </div>
                <div>
                  <div className="row-title">
                    {r.bloodGroup} · {r.units} unit(s) · {r.urgency}
                  </div>
                  <div className="row-sub">
                    {r.hospital} · {r.area}
                  </div>
                  <div className="row-sub">
                    Requested by {r.seeker?.name} · {r.seeker?.phone}
                  </div>
                </div>
              </div>

              {r.myResponse === "Pending" ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button disabled={busyId === r.requestId} onClick={() => respond(r.requestId, "Accepted")}>
                    <Check size={14} /> Accept
                  </button>
                  <button
                    className="ghost"
                    disabled={busyId === r.requestId}
                    onClick={() => respond(r.requestId, "Declined")}
                  >
                    <X size={14} /> Decline
                  </button>
                </div>
              ) : (
                <span className={`pill ${r.myResponse === "Accepted" ? "pill-confirmed" : "pill-expired"}`}>
                  You {r.myResponse.toLowerCase()}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SeekerFeed() {
  const [requests, setRequests] = useState(null);

  useEffect(() => {
    api
      .get("/api/requests/me")
      .then((d) => setRequests(d.requests))
      .catch(() => {});
  }, []);

  // Flatten every contactedDonors response across all of this seeker's requests into one feed.
  const events =
    requests
      ?.flatMap((r) =>
        r.contactedDonors
          .filter((c) => c.status !== "Pending")
          .map((c) => ({ ...c, request: r }))
      )
      .sort((a, b) => new Date(b.respondedAt) - new Date(a.respondedAt)) || [];

  return (
    <div>
      <div className="page-header">
        <h1>Notifications</h1>
        <p>Stay updated on your requests.</p>
      </div>

      <div className="card">
        {!requests ? (
          <p className="loading">Loading...</p>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">
              <Bell size={30} style={{ margin: "0 auto" }} />
            </div>
            <p>No donor responses yet.</p>
            <p style={{ fontSize: "0.82rem", marginTop: 4 }}>
              As soon as a matched donor accepts or declines, it'll show up here.
            </p>
          </div>
        ) : (
          events.map((e, i) => (
            <Link key={i} to={`/requests/${e.request._id}`} className="list-row" style={{ color: "inherit" }}>
              <div className="list-row-main">
                <div
                  className="row-icon"
                  style={{
                    background: e.status === "Accepted" ? "var(--green-soft)" : "var(--border)",
                    color: e.status === "Accepted" ? "var(--green)" : "var(--text-soft)",
                  }}
                >
                  {e.status === "Accepted" ? <Check size={16} /> : <X size={16} />}
                </div>
                <div>
                  <div className="row-title">
                    {e.donor?.user?.name || "A donor"} {e.status === "Accepted" ? "accepted" : "declined"} your
                    request
                  </div>
                  <div className="row-sub">
                    {e.request.bloodGroup} · {e.request.units} unit(s) · {e.request.hospital}
                  </div>
                </div>
              </div>
              <span className="row-time">{new Date(e.respondedAt).toLocaleString()}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
