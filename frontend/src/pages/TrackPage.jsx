import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Droplet, MapPin, RefreshCw } from "lucide-react";
import { api } from "../api";
import { UrgencyPill } from "../components/StatusPill";

const STAGES = ["Searching", "Contacted", "Confirmed", "Fulfilled"];
const STAGE_LABELS = {
  Searching: "Searching Donors",
  Contacted: "Contacting Donors",
  Confirmed: "Donor Confirmed",
  Fulfilled: "Fulfilled",
};
const POLL_MS = 15000;

export default function TrackPage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    let cancelled = false;

    function load() {
      api
        .get(`/api/requests/public/${token}`)
        .then((d) => {
          if (cancelled) return;
          setInfo(d);
          setError("");
          setLastChecked(new Date());
        })
        .catch((err) => !cancelled && setError(err.message));
    }

    load();
    const timer = setInterval(load, POLL_MS); // keeps everyone in the group looking at the same live status
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token]);

  const currentIndex = info ? STAGES.indexOf(info.status) : -1;

  return (
    <div className="auth-shell" style={{ alignItems: "flex-start", paddingTop: 40 }}>
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <Link to="/" className="sidebar-brand" style={{ padding: 0, marginBottom: 18 }}>
          <span className="mark">
            <Droplet size={16} fill="currentColor" />
          </span>
          RaktSetu
        </Link>

        {error && <p className="error">{error}</p>}
        {!info && !error && <p className="status">Loading live status…</p>}

        {info && (
          <>
            <h2 style={{ marginBottom: 4 }}>
              {info.bloodGroup} · {info.units} unit{info.units > 1 ? "s" : ""} needed
            </h2>
            <p style={{ color: "var(--text-soft)", fontSize: "0.9rem", margin: "0 0 14px" }}>
              <MapPin size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
              {info.hospital}, {info.area} &nbsp;<UrgencyPill urgency={info.urgency} />
            </p>

            {info.status === "Expired" ? (
              <p className="empty-note">This request is no longer active.</p>
            ) : (
              <div className="icon-stepper">
                {STAGES.map((stage, i) => {
                  const done = i < currentIndex || info.status === "Fulfilled";
                  const current = i === currentIndex && info.status !== "Fulfilled";
                  return (
                    <div key={stage} className={`step ${done ? "done" : ""} ${current ? "current" : ""}`}>
                      <span className="dot">{done ? <Check size={16} /> : i + 1}</span>
                      <span className="label">{STAGE_LABELS[stage]}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {info.awaitingHospitalVerification && info.status === "Searching" && (
              <p className="status">Waiting for the hospital to verify this Critical request before donors are notified.</p>
            )}

            <div className="list-row">
              <span className="row-sub">Donors contacted</span>
              <strong>{info.donorsContacted}</strong>
            </div>
            <div className="list-row">
              <span className="row-sub">Donors who accepted</span>
              <strong>{info.donorsAccepted}</strong>
            </div>

            <p className="row-sub" style={{ marginTop: 12 }}>
              <RefreshCw size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />
              Updates automatically every few seconds
              {lastChecked && <> · last checked {lastChecked.toLocaleTimeString()}</>}
            </p>

            <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <p style={{ fontSize: "0.88rem", margin: "0 0 10px" }}>
                Can you donate, or know someone who can? RaktSetu matches donors to requests like this one.
              </p>
              <Link to="/signup" className="btn-primary">
                Join as a donor
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
