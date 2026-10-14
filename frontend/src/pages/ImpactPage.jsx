import { useEffect, useState } from "react";
import { Clock, Zap, CheckCircle2, ShieldCheck, Info } from "lucide-react";
import { api } from "../api";
import Skeleton from "../components/Skeleton";

const fmtMinutes = (m) => (m === null || m === undefined ? "—" : m < 60 ? `${m} min` : `${Math.round((m / 60) * 10) / 10} h`);
const fmtPercent = (p) => (p === null || p === undefined ? "—" : `${p}%`);
const REASON_LABELS = { "Timed out": "Timed out", "Closed by requester": "Closed by the requester", "Closed by admin": "Closed by a moderator", Other: "Other" };

export default function ImpactPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/stats/impact").then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <Skeleton rows={4} />;

  const { responseTime: rt, urgentCoverage: uc, outcomes: oc, totals, donorsByArea } = data;
  const maxArea = Math.max(1, ...donorsByArea.map((a) => a.total));
  const noData = <span className="row-sub">Not enough data yet</span>;

  return (
    <div>
      <div className="page-header">
        <h1>Impact &amp; metrics</h1>
        <p>How RaktSetu is actually performing — computed live from real requests, with the sample size beside every number.</p>
      </div>

      {data.demoDataIncluded && (
        <div className="availability-card" style={{ marginBottom: 20 }}>
          <span>
            <Info size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />
            <strong>This page currently includes sample demo data.</strong> Those numbers illustrate how the metrics work —
            they are not real usage.
          </span>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "var(--blue-soft)", color: "var(--blue)" }}>
            <Clock size={18} />
          </div>
          <div className="stat-value">{fmtMinutes(rt.medianFirstReplyMinutes)}</div>
          <div className="stat-label">Median time to a donor's first reply</div>
          {rt.repliedSample ? (
            <div className="row-sub" style={{ marginTop: 6 }}>
              Average {fmtMinutes(rt.avgFirstReplyMinutes)} · {rt.repliedSample} request{rt.repliedSample > 1 ? "s" : ""}
            </div>
          ) : (
            noData
          )}
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "var(--orange-soft)", color: "var(--orange)" }}>
            <Zap size={18} />
          </div>
          <div className="stat-value">{fmtPercent(uc.percent)}</div>
          <div className="stat-label">Urgent requests accepted within {uc.windowMinutes} min</div>
          {uc.eligible ? (
            <div className="row-sub" style={{ marginTop: 6 }}>
              {uc.acceptedWithinWindow} of {uc.eligible} Urgent/Critical requests
            </div>
          ) : (
            noData
          )}
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "var(--green-soft)", color: "var(--green)" }}>
            <CheckCircle2 size={18} />
          </div>
          <div className="stat-value">{fmtPercent(oc.fulfilmentRate)}</div>
          <div className="stat-label">Of closed requests were fulfilled</div>
          {oc.closed ? (
            <div className="row-sub" style={{ marginTop: 6 }}>
              {oc.fulfilled} fulfilled · {oc.expired} closed without a donor
            </div>
          ) : (
            noData
          )}
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "var(--purple-soft)", color: "var(--purple)" }}>
            <ShieldCheck size={18} />
          </div>
          <div className="stat-value">{totals.verifiedDonors}</div>
          <div className="stat-label">Hospital-verified donors</div>
          <div className="row-sub" style={{ marginTop: 6 }}>
            of {totals.donors} registered · {totals.hospitalPartners} hospital partner{totals.hospitalPartners === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h3>How requests ended</h3>
          <div className="list-row">
            <span>Fulfilled</span>
            <strong>{oc.fulfilled}</strong>
          </div>
          <div className="list-row">
            <span>Still open</span>
            <strong>{oc.open}</strong>
          </div>
          <div className="list-row">
            <span>Closed without a donor</span>
            <strong>{oc.expired}</strong>
          </div>
          {Object.entries(oc.expiredBreakdown).map(([reason, n]) => (
            <div key={reason} className="list-row" style={{ paddingLeft: 16 }}>
              <span className="row-sub">{REASON_LABELS[reason] || reason}</span>
              <span className="row-sub">{n}</span>
            </div>
          ))}
          {data.removedAsFake > 0 && (
            <p className="row-sub" style={{ marginTop: 10 }}>
              {data.removedAsFake} request{data.removedAsFake > 1 ? "s" : ""} taken down as fake {data.removedAsFake > 1 ? "are" : "is"} excluded from every figure.
            </p>
          )}
        </div>

        <div className="card">
          <h3>Donors by area</h3>
          {donorsByArea.length === 0 ? (
            <p className="empty-note">No donors registered yet.</p>
          ) : (
            donorsByArea.map((a) => (
              <div key={a.area} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: 4 }}>
                  <span>{a.area}</span>
                  <span className="row-sub">
                    {a.total} total · {a.available} available · {a.verified} verified
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
                  <div style={{ width: `${(a.total / maxArea) * 100}%`, height: "100%", background: "var(--primary)" }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <h3>How these are measured</h3>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-soft)", fontSize: "0.88rem", lineHeight: 1.7 }}>
          <li>Response time runs from the moment a request is raised to a donor's first reply. Critical requests include the time spent waiting for hospital verification.</li>
          <li>The {uc.windowMinutes}-minute figure only counts Urgent and Critical requests old enough to have had the full {uc.windowMinutes} minutes.</li>
          <li>Areas are the free-text areas donors typed in, grouped ignoring capitalisation and spacing.</li>
          <li>Small samples are shown as they are — treat a figure based on a handful of requests as an example, not a trend.</li>
        </ul>
      </div>
    </div>
  );
}
