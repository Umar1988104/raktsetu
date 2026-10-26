import { useEffect, useRef, useState } from "react";
import Skeleton from "../components/Skeleton";
import { useParams } from "react-router-dom";
import { playFlipIn } from "../utils/flip";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Check, Clock, CalendarClock } from "lucide-react";
import { useConfirm, useToast } from "../components/UiFeedback";
import { api } from "../api";
import { UrgencyPill } from "../components/StatusPill";
import ReadAloudButton from "../components/ReadAloudButton";
import ShareRequestButton from "../components/ShareRequestButton";
import RequestPosterButton from "../components/RequestPosterButton";
import SelfDeclaredNote from "../components/SelfDeclaredNote";
import ContactButtons from "../components/ContactButtons";
import MatchMap from "../components/MatchMap";
import RequestTimeline from "../components/RequestTimeline";
import FulfilledMoment from "../components/FulfilledMoment";
import { useRefreshHandler } from "../context/RefreshContext";
import { requestHeadline, formatNeededBy } from "../requestFormat";

const STAGES = ["Searching", "Contacted", "Confirmed", "Fulfilled"];
const TIER_CLASS = { New: "pill-expired", Trusted: "pill-confirmed", Pillar: "pill-verified" };
const STAGE_LABELS = {
  Searching: "Searching Donors",
  Contacted: "Contacting Donors",
  Confirmed: "Donor Confirmed",
  Fulfilled: "Fulfilled",
};

function pinIcon(color, label) {
  return L.divIcon({
    html: `<div style="background:${color};color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.35);">${label}</div>`,
    className: "",
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

export default function RequestStatusPage() {
  const { id } = useParams();
  const titleRef = useRef(null);
  const [request, setRequest] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const askConfirm = useConfirm();
  const toast = useToast();

  function load() {
    return Promise.all([
      api
        .get(`/api/requests/${id}`)
        .then((d) => setRequest(d.request))
        .catch((err) => setError(err.message)),
      api
        .get(`/api/requests/${id}/matches`)
        .then(setMatchData)
        .catch(() => {}),
    ]);
  }
  useRefreshHandler(load); // pull down to refresh on a phone

  // Glide the heading in from where the opened list row was (once per visit).
  const flipped = useRef(false);
  useEffect(() => {
    if (request && !flipped.current) {
      flipped.current = true;
      playFlipIn(id, titleRef.current);
    }
  }, [request, id]);

  useEffect(() => {
    load();
  }, [id]);

  // "Live" (v2.0): while a request is open and this tab is showing, refresh quietly every 20 seconds.
  useEffect(() => {
    if (!request || ["Fulfilled", "Expired"].includes(request.status)) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 20000);
    return () => clearInterval(timer);
  }, [id, request?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function advanceStatus(newStatus) {
    setBusy(true);
    try {
      await api.patch(`/api/requests/${id}/status`, { status: newStatus });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // "Yes, I still need blood" — keeps the request open and keeps searching.
  async function extendRequest() {
    setBusy(true);
    try {
      await api.post(`/api/requests/${id}/extend`, {});
      toast("Kept open — we'll keep looking for donors.", "success");
      load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  // "No longer needed" — closes it so donors stop being notified.
  async function closeRequest() {
    const ok = await askConfirm({
      title: "Close this request?",
      message: "Donors will stop being notified. You can always create a new request later.",
      confirmLabel: "Close request",
      cancelLabel: "Keep it open",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.post(`/api/requests/${id}/close`, {});
      toast("Request closed.", "info");
      load();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!request) return <Skeleton rows={3} />;

  const currentIndex = STAGES.indexOf(request.status);
  const isExpired = request.status === "Expired";

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 ref={titleRef}>{requestHeadline(request)}</h1>
          <p>
            Track the status of your blood request in real time.
            {request.patientName && <> For {request.patientName}.</>}
          </p>
        </div>
        <ReadAloudButton
          text={`${request.bloodGroup}${request.component && request.component !== "Whole blood" ? " " + request.component : ""}, ${request.units} units, ${request.urgency} urgency, at ${request.hospital}. Current status: ${request.status}.${request.patientName ? ` For ${request.patientName}.` : ""}`}
        />
      </div>

      {request.status === "Fulfilled" && <FulfilledMoment requestId={request._id} />}

      {request.lifecycle?.scheduled && (
        <div className="banner banner-info" role="status">
          <CalendarClock size={20} />
          <div className="banner-text">
            <strong>Planned for {formatNeededBy(request.neededBy)}.</strong> Donors will be contacted from{" "}
            {formatNeededBy(request.lifecycle.releaseAt)}, so they aren't asked too early. Nothing else to do for now.
            {request.fromRecurringPlan && " This came from one of your repeating requests."}
          </div>
        </div>
      )}

      {!isExpired && (
        <div style={{ marginBottom: 24, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <ShareRequestButton request={request} />
          <RequestPosterButton request={request} />
        </div>
      )}

      {request.urgency === "Critical" && !request.hospitalVerified && request.status === "Searching" && (
        <div className="availability-card" style={{ marginBottom: 24 }}>
          <span>
            Awaiting verification from <strong>{request.hospital}</strong> before donors are notified —
            this happens automatically once they verify it.
          </span>
        </div>
      )}

      {request.lifecycle?.showStillNeedPrompt && (
        <div className="availability-card" style={{ marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
          <span>
            <Clock size={15} style={{ verticalAlign: "middle", marginRight: 8 }} />
            <strong>Still need blood?</strong> This request closes in about {request.lifecycle.hoursLeft} hours
            {request.lifecycle.canExtend ? "." : " and can't be extended any further."}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            {request.lifecycle.canExtend && (
              <button disabled={busy} onClick={extendRequest}>
                Yes, keep it open
              </button>
            )}
            <button className="ghost" disabled={busy} onClick={closeRequest}>
              No longer needed
            </button>
          </div>
        </div>
      )}

      {isExpired && (
        <div className="card">
          <h3>This request is closed</h3>
          <p style={{ color: "var(--text-soft)", fontSize: "0.92rem", margin: 0 }}>
            {{
              "Timed out": "It reached its time limit without a donor confirming. If you still need blood, create a new request.",
              "Closed by requester": "You closed this request.",
              "Reported as fake": "It was taken down after donors reported it.",
              "Closed by admin": "It was closed by a RaktSetu moderator.",
            }[request.closedReason] || "It's no longer open."}
          </p>
        </div>
      )}

      {!isExpired && (
        <div className="card">
          <div className="icon-stepper">
            {STAGES.map((stage, i) => {
              const done = i < currentIndex || request.status === "Fulfilled";
              const current = i === currentIndex && request.status !== "Fulfilled";
              return (
                <div key={stage} className={`step ${done ? "done" : ""} ${current ? "current" : ""}`}>
                  <span className="dot">{done ? <Check size={16} /> : i + 1}</span>
                  <span className="label">{STAGE_LABELS[stage]}</span>
                </div>
              );
            })}
          </div>

          {request.status !== "Fulfilled" && !(request.urgency === "Critical" && !request.hospitalVerified) && (
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {request.status !== "Confirmed" && (
                <button className="secondary" disabled={busy} onClick={() => advanceStatus("Confirmed")}>
                  Mark as Donor Confirmed
                </button>
              )}
              <button className="secondary" disabled={busy} onClick={() => advanceStatus("Fulfilled")}>
                Mark as Fulfilled
              </button>
            </div>
          )}

          <p className="row-sub" style={{ marginTop: 12 }}>
            {request.contactedDonors?.length || 0} donor(s) notified
            {request.escalationRound > 0 &&
              ` · search widened ${request.escalationRound} time${request.escalationRound > 1 ? "s" : ""} because no one had accepted yet`}
          </p>
        </div>
      )}

      {request.contactedDonors?.some((c) => c.status === "Accepted") && (
        <div className="card">
          <h3>Donors who accepted</h3>
          {request.contactedDonors
            .filter((c) => c.status === "Accepted")
            .map((c) => (
              <div key={c._id} className="list-row">
                <div>
                  <div className="row-title">
                    {c.donorDisplay.name}
                    {c.donorDisplay.relation && ` (${c.donorDisplay.relation})`}
                  </div>
                  <div className="row-sub">Accepted {c.respondedAt ? new Date(c.respondedAt).toLocaleString() : ""}</div>
                </div>
                <ContactButtons phone={c.donorDisplay.phone} hospital={request.hospital} />
              </div>
            ))}
        </div>
      )}

      {request.status === "Fulfilled" && request.contactedDonors?.some((c) => c.status === "Accepted") && (
        <ThankYouCard request={request} onSent={load} />
      )}

      <div className="two-col">
        <div className="card">
          <h3>Request details</h3>
          <div className="list-row">
            <span className="row-sub">Blood group</span>
            <strong>{request.bloodGroup}</strong>
          </div>
          {request.component && request.component !== "Whole blood" && (
            <div className="list-row">
              <span className="row-sub">Needed</span>
              <strong>{request.component}</strong>
            </div>
          )}
          <div className="list-row">
            <span className="row-sub">Units</span>
            <strong>{request.units}</strong>
          </div>
          {request.neededBy && (
            <div className="list-row">
              <span className="row-sub">Needed by</span>
              <strong>{formatNeededBy(request.neededBy)}</strong>
            </div>
          )}
          <div className="list-row">
            <span className="row-sub">Hospital</span>
            <strong>{request.hospital}</strong>
          </div>
          <div className="list-row">
            <span className="row-sub">Area</span>
            <strong>{request.area}</strong>
          </div>
          <div className="list-row">
            <span className="row-sub">Urgency</span>
            <UrgencyPill urgency={request.urgency} />
          </div>
          {request.notes && (
            <div className="list-row">
              <span className="row-sub">Notes</span>
              <span>{request.notes}</span>
            </div>
          )}
        </div>

        <RequestTimeline request={request} />

        <div className="card">
          <h3>Nearby compatible donors</h3>
          <SelfDeclaredNote />
          {!matchData ? (
            <Skeleton rows={2} />
          ) : matchData.matches.length === 0 ? (
            <p className="empty-note">No available, compatible donors found nearby yet.</p>
          ) : (
            <>
              <MatchMap request={matchData.request} matches={matchData.matches} requestIcon={pinIcon("#C62839", "R")} />
              <ul className="match-list">
                {matchData.matches.map((m, i) => (
                  <li key={m._id}>
                    <span>
                      #{i + 1} {m.donor?.name}
                      {m.donor?.relation && ` (${m.donor.relation})`} · {m.bloodGroup}
                      {m.accepted && <span className="pill pill-confirmed" style={{ marginLeft: 8 }}>Accepted</span>}
                      {m.verified && <span className="pill pill-verified" style={{ marginLeft: 8 }}>Verified</span>}
                      {m.trustTier && <span className={`pill ${TIER_CLASS[m.trustTier] || "pill-expired"}`} style={{ marginLeft: 8 }}>{m.trustTier}</span>}
                    </span>
                    <span className="match-distance">{m.distanceKm} km</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// After fulfilment, the seeker can send one short private thank-you to the
// donors who accepted. Closes the loop without exposing anyone's contact info.
function ThankYouCard({ request, onSent }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (request.thankYouNote?.sentAt) {
    return (
      <div className="card">
        <h3>Thank-you sent</h3>
        <p style={{ color: "var(--text-soft)", fontSize: "0.9rem", margin: 0 }}>
          Your note went to the donors who accepted: &ldquo;{request.thankYouNote.message}&rdquo;
        </p>
      </div>
    );
  }

  async function send(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post(`/api/requests/${request._id}/thank-you`, { message });
      onSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={send} className="card">
      <h3>Say thank you</h3>
      <p style={{ color: "var(--text-soft)", fontSize: "0.88rem", marginTop: -6 }}>
        Send one short private note to the donors who accepted. No contact details are shared either way.
      </p>
      <textarea
        rows={3}
        maxLength={300}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Thank you — your help meant the world to our family."
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={busy} style={{ width: "auto" }}>
        {busy ? "Sending..." : "Send thank-you"}
      </button>
    </form>
  );
}
