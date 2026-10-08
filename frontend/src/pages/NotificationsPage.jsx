import { useEffect, useState } from "react";
import Skeleton from "../components/Skeleton";
import { Link } from "react-router-dom";
import { Bell, Check, X, Droplet, Flag } from "lucide-react";
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
  const [busyKey, setBusyKey] = useState(null);

  function load() {
    api
      .get("/api/donors/me/incoming-requests")
      .then((d) => setIncoming(d.incoming))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function reportFake(requestId) {
    if (!confirm("Report this request as fake/spam? After 2 reports it's automatically pulled down.")) return;
    try {
      await api.post(`/api/requests/${requestId}/report`, {});
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function respond(requestId, donorId, response) {
    const key = `${requestId}:${donorId}`;
    setBusyKey(key);
    try {
      await api.post(`/api/requests/${requestId}/respond`, { response, donorId });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
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
          <Skeleton rows={3} />
        ) : incoming.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">
              <Bell size={30} style={{ margin: "0 auto" }} />
            </div>
            <p>No requests have matched you yet.</p>
            <p style={{ fontSize: "0.82rem", marginTop: 4 }}>
              Make sure a profile under your account is marked "Available" — that's how you show
              up in matching.
            </p>
          </div>
        ) : (
          incoming.map((r) => {
            const key = `${r.requestId}:${r.donorId}`;
            return (
              <div key={key} className="list-row" style={{ alignItems: "flex-start" }}>
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
                      {r.patientName && <> · for {r.patientName}</>}
                    </div>
                    <div className="row-sub">
                      Requested by {r.seeker?.name} · {r.seeker?.phone}
                    </div>
                    {r.respondingAs !== "you" && (
                      <div className="row-sub" style={{ fontStyle: "italic" }}>
                        Responding as {r.respondingAs}
                      </div>
                    )}
                  </div>
                </div>

                {r.myResponse === "Pending" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button disabled={busyKey === key} onClick={() => respond(r.requestId, r.donorId, "Accepted")}>
                        <Check size={14} /> Accept
                      </button>
                      <button
                        className="ghost"
                        disabled={busyKey === key}
                        onClick={() => respond(r.requestId, r.donorId, "Declined")}
                      >
                        <X size={14} /> Decline
                      </button>
                    </div>
                    <button
                      className="ghost"
                      style={{ fontSize: "0.72rem", padding: "4px 10px" }}
                      disabled={busyKey === key}
                      onClick={() => reportFake(r.requestId)}
                    >
                      <Flag size={12} /> Report as fake
                    </button>
                  </div>
                ) : (
                  <span className={`pill ${r.myResponse === "Accepted" ? "pill-confirmed" : "pill-expired"}`}>
                    {r.myResponse === "Accepted" ? "Accepted" : "Declined"}
                  </span>
                )}
              </div>
            );
          })
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
      ?.flatMap((r) => r.contactedDonors.filter((c) => c.status !== "Pending").map((c) => ({ ...c, request: r })))
      .sort((a, b) => new Date(b.respondedAt) - new Date(a.respondedAt)) || [];

  return (
    <div>
      <div className="page-header">
        <h1>Notifications</h1>
        <p>Stay updated on your requests.</p>
      </div>

      <div className="card">
        {!requests ? (
          <Skeleton rows={3} />
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
                    {e.donorDisplay?.name || "A donor"} {e.status === "Accepted" ? "accepted" : "declined"} your
                    request
                    {e.request.patientName && <> for {e.request.patientName}</>}
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
