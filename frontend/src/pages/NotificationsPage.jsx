import EmptyState from "../components/EmptyState";
import SwipeRow from "../components/SwipeRow";
import { useRefreshHandler } from "../context/RefreshContext";
import useDismissed from "../hooks/useDismissed";
import { groupByDay } from "../dayGroups";
import { useEffect, useState } from "react";
import Skeleton from "../components/Skeleton";
import ContactButtons from "../components/ContactButtons";
import { requestHeadline, formatNeededBy } from "../requestFormat";
import * as m from "motion/react-m";
import { StaggerList, staggerItem } from "../motion/kit";
import { Link } from "react-router-dom";
import { Check, X, Droplet, Flag, Heart } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import { useConfirm } from "../components/UiFeedback";

export default function NotificationsPage() {
  const { profile } = useAuth();
  const role = profile?.user?.role;
  return role === "donor" ? <DonorInbox /> : <SeekerFeed />;
}

function DonorInbox() {
  const askConfirm = useConfirm();
  const [incoming, setIncoming] = useState(null);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState(null);

  function load() {
    return api
      .get("/api/donors/me/incoming-requests")
      .then((d) => setIncoming(d.incoming))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useRefreshHandler(load); // pull down to refresh on a phone

  async function reportFake(requestId) {
    const ok = await askConfirm({
      title: "Report this request as fake?",
      message: "If two different donors report it, the request is automatically taken down and the account that raised it is blocked from new requests for 48 hours.",
      confirmLabel: "Report as fake",
      tone: "danger",
    });
    if (!ok) return;
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

  const { dismissed, dismiss, restoreAll } = useDismissed("donor-inbox");
  const [showDismissed, setShowDismissed] = useState(false);
  const keyOf = (r) => `${r.requestId}:${r.donorId}`;
  const isActionable = (r) => r.myResponse === "Pending" && !r.closed;
  const rank = { Critical: 0, Urgent: 1, Normal: 2 };
  const visible = (incoming || []).filter((r) => isActionable(r) || showDismissed || !dismissed.has(keyOf(r)));
  const needs = visible.filter(isActionable).sort((a, b) => (rank[a.urgency] ?? 3) - (rank[b.urgency] ?? 3) || new Date(b.notifiedAt) - new Date(a.notifiedAt));
  const rest = visible.filter((r) => !isActionable(r));

  const renderItem = (r) => {
    const key = keyOf(r);
    return (
              <m.div key={key} variants={staggerItem} layout="position" className={`list-row notif-item ${isActionable(r) && r.urgency === "Critical" ? "critical" : ""}`} style={{ alignItems: "flex-start" }}>
                <div className="list-row-main">
                  <div className="row-icon" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>
                    <Droplet size={16} />
                  </div>
                  <div>
                    <div className="row-title">
                      {requestHeadline(r)} · {r.urgency}
                      {isActionable(r) && r.urgency === "Critical" && <span className="pill pill-urgent" style={{ marginLeft: 8 }}>Critical — please respond</span>}
                    </div>
                    {r.neededBy && <div className="row-sub">Needed by {formatNeededBy(r.neededBy)}</div>}
                    <div className="row-sub">
                      {r.hospital} · {r.area}
                      {r.patientName && <> · for {r.patientName}</>}
                    </div>
                    <div className="row-sub">
                      Requested by {r.seeker?.name}
                      {r.seeker?.phone ? ` · ${r.seeker.phone}` : " · phone shared once you accept"}
                    </div>
                    {r.seeker?.phone && (
                      <div style={{ marginTop: 8 }}>
                        <ContactButtons phone={r.seeker.phone} hospital={r.hospital} />
                      </div>
                    )}
                    {r.respondingAs !== "you" && (
                      <div className="row-sub" style={{ fontStyle: "italic" }}>
                        Responding as {r.respondingAs}
                      </div>
                    )}
                    {r.thankYouNote && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: "8px 12px",
                          background: "var(--green-soft)",
                          borderRadius: 10,
                          fontSize: "0.85rem",
                          color: "var(--green)",
                        }}
                      >
                        <Heart size={12} style={{ verticalAlign: "middle", marginRight: 8 }} />
                        &ldquo;{r.thankYouNote.message}&rdquo;
                      </div>
                    )}
                  </div>
                </div>

                {r.myResponse === "Pending" && r.closed ? (
                  <span className="pill pill-expired">Request closed</span>
                ) : r.myResponse === "Pending" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
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
                      style={{ fontSize: "0.72rem", padding: "4px 12px" }}
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
              </m.div>
    );
  };

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
          <EmptyState art="notifications" title="No requests have matched you yet.">
            <p className="status">
              Make sure a profile under your account is marked "Available" — that's how you show
              up in matching.
            </p>
          </EmptyState>
        ) : (
          <>
            {needs.length > 0 && (
              <section aria-label="Needs your answer">
                <h2 className="notif-group-title urgent-title">Needs your answer</h2>
                <StaggerList>{needs.map((r) => renderItem(r))}</StaggerList>
              </section>
            )}
            {groupByDay(rest, (r) => r.notifiedAt).map((g) => (
              <section key={g.label} aria-label={g.label}>
                <h2 className="notif-group-title">{g.label}</h2>
                <StaggerList>
                  {g.items.map((r) => (
                    <SwipeRow key={keyOf(r)} onDismiss={() => dismiss(keyOf(r))}>
                      {renderItem(r)}
                    </SwipeRow>
                  ))}
                </StaggerList>
              </section>
            ))}
            {dismissed.size > 0 && (
              <p className="status" style={{ textAlign: "center", marginTop: 16 }}>
                <button type="button" className="linklike" onClick={() => (showDismissed ? setShowDismissed(false) : setShowDismissed(true))}>
                  {showDismissed ? "Hide dismissed" : `Show dismissed (${dismissed.size})`}
                </button>
                {" · "}
                <button type="button" className="linklike" onClick={restoreAll}>Restore all</button>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SeekerFeed() {
  const [requests, setRequests] = useState(null);

  const load = () =>
    api
      .get("/api/requests/me")
      .then((d) => setRequests(d.requests))
      .catch(() => {});
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useRefreshHandler(load); // pull down to refresh on a phone

  const { dismissed, dismiss, restoreAll } = useDismissed("seeker-feed");
  const [showDismissed, setShowDismissed] = useState(false);
  // Flatten every contactedDonors response across all of this seeker's requests into one feed.
  const keyOf = (e) => `${e.request._id}:${e._id || e.respondedAt}`;
  const events = (requests?.flatMap((r) => r.contactedDonors.filter((c) => c.status !== "Pending").map((c) => ({ ...c, request: r }))) || []).filter((e) => showDismissed || !dismissed.has(keyOf(e)));
  const groups = groupByDay(events, (e) => e.respondedAt);

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
          <EmptyState art="notifications" title="No donor responses yet.">
            <p className="status">
              As soon as a matched donor accepts or declines, it'll show up here.
            </p>
          </EmptyState>
        ) : (
          <>
            {groups.map((g) => (
              <section key={g.label} aria-label={g.label}>
                <h2 className="notif-group-title">{g.label}</h2>
                {g.items.map((e) => (
                  <SwipeRow key={keyOf(e)} onDismiss={() => dismiss(keyOf(e))}>
            <Link to={`/requests/${e.request._id}`} className="list-row" style={{ color: "inherit" }}>
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
                  </SwipeRow>
                ))}
              </section>
            ))}
            {dismissed.size > 0 && (
              <p className="status" style={{ textAlign: "center", marginTop: 16 }}>
                <button type="button" className="linklike" onClick={() => setShowDismissed((v) => !v)}>
                  {showDismissed ? "Hide dismissed" : `Show dismissed (${dismissed.size})`}
                </button>
                {" · "}
                <button type="button" className="linklike" onClick={restoreAll}>Restore all</button>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
