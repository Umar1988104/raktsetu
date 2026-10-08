import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Droplet,
  MapPin,
  BellRing,
  ActivitySquare,
  ShieldCheck,
  PhoneOff,
  Hourglass,
  Building2,
} from "lucide-react";
import { api } from "../api";

export default function Landing() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/api/stats").then(setStats).catch(() => {});
  }, []);

  return (
    <div>
      <nav className="landing-nav">
        <div className="sidebar-brand" style={{ padding: 0 }}>
          <span className="mark">
            <Droplet size={16} fill="currentColor" />
          </span>
          RaktSetu
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <Link to="/emergency" style={{ color: "var(--primary)", fontWeight: 700 }}>
            Emergency — Request Now
          </Link>
          <Link to="/login">Log in</Link>
          <Link to="/signup" className="btn-primary">
            Get started
          </Link>
        </div>
      </nav>

      {/* ---------- Hero ---------- */}
      <div className="landing-hero">
        <div>
          <h1>
            Because every <span className="accent">drop</span> counts.
          </h1>
          <p>
            Connect nearby compatible donors with people who need blood right now — one
            trackable request instead of forty frantic phone calls.
          </p>
          <div className="cta-row" style={{ marginTop: 26 }}>
            <Link to="/signup" className="btn-primary">
              Get started
            </Link>
            <Link to="/login" className="btn-outline">
              Log in
            </Link>
          </div>
          <Link to="/emergency" style={{ display: "inline-block", marginTop: 14, fontSize: "0.88rem", color: "var(--primary)", fontWeight: 600 }}>
            Need blood right now? Request without an account →
          </Link>

          <div className="landing-stats">
            <div>
              <div className="num">{stats ? stats.totalDonors : "—"}</div>
              <div className="lbl">Registered donors</div>
            </div>
            <div>
              <div className="num">{stats ? stats.availableDonors : "—"}</div>
              <div className="lbl">Available right now</div>
            </div>
            <div>
              <div className="num">{stats ? stats.fulfilledRequests : "—"}</div>
              <div className="lbl">Requests fulfilled</div>
            </div>
          </div>
        </div>

        <HeroArt />
      </div>

      {/* ---------- The problem ---------- */}
      <section className="landing-section">
        <div className="section-inner">
          <p className="section-kicker">The problem</p>
          <h2>Finding a donor in time shouldn't depend on luck.</h2>
          <div className="problem-grid">
            <div className="problem-card">
              <Hourglass size={20} className="problem-icon" />
              <div className="problem-num">14.6M</div>
              <p>units of blood India needs every year, per a government reply in the Rajya Sabha (2025).</p>
            </div>
            <div className="problem-card">
              <MapPin size={20} className="problem-icon" />
              <div className="problem-num">46%</div>
              <p>of India lives in a "blood desert" where local demand can't be met (BMJ, 2024).</p>
            </div>
            <div className="problem-card">
              <PhoneOff size={20} className="problem-icon" />
              <div className="problem-num">0.17</div>
              <p>units per 1,000 people within a 60-minute radius in Bihar — the worst-served state.</p>
            </div>
          </div>
          <p className="section-foot">
            Right now, families facing an emergency still rely on manual outreach — phone calls to
            relatives, WhatsApp broadcast groups, and calling hospitals one by one. Every minute
            spent dialing is a minute not spent helping.
          </p>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="landing-section alt">
        <div className="section-inner">
          <p className="section-kicker">How it works</p>
          <h2>From request to donor, in one flow.</h2>
          <div className="steps-grid">
            <HowStep icon={<Droplet size={20} />} title="Raise a request" text="Blood group, units, urgency, and hospital — takes under a minute." />
            <HowStep icon={<ActivitySquare size={20} />} title="We rank real matches" text="Compatible, available, nearby donors — ranked by actual distance, not a static directory." />
            <HowStep icon={<BellRing size={20} />} title="Donors are notified" text="Matched donors get notified instantly and can accept or decline with one tap." />
            <HowStep icon={<ShieldCheck size={20} />} title="Tracked to fulfilment" text="Status moves automatically as a donor accepts — right through to fulfilled." />
          </div>
        </div>
      </section>

      {/* ---------- Differentiation ---------- */}
      <section className="landing-section">
        <div className="section-inner">
          <p className="section-kicker">Why RaktSetu</p>
          <h2>Not another static directory.</h2>
          <div className="compare-row">
            <div className="compare-card">
              <Building2 size={18} />
              <strong>eRaktKosh</strong>
              <p>Official nationwide blood-bank stock directory by state and district — shows what banks hold, doesn't actively match or notify individual donors.</p>
            </div>
            <div className="compare-card highlight">
              <Droplet size={18} />
              <strong>RaktSetu</strong>
              <p>Actively matches and notifies nearby individual donors by compatibility, distance, and urgency — with verification tiers for the highest-risk requests.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Hospital trust showcase ---------- */}
      <section className="landing-section alt">
        <div className="section-inner" style={{ textAlign: "center" }}>
          <p className="section-kicker" style={{ textAlign: "center" }}>
            Trust
          </p>
          {stats?.hospitalPartners?.count > 0 ? (
            <>
              <h2 style={{ margin: "0 auto 28px", textAlign: "center" }}>
                Trusted by {stats.hospitalPartners.count} verified hospital
                {stats.hospitalPartners.count === 1 ? "" : "s"} &amp; blood banks
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
                {stats.hospitalPartners.names.map((name) => (
                  <span key={name} className="pill pill-verified" style={{ fontSize: "0.85rem", padding: "8px 16px" }}>
                    <Building2 size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />
                    {name}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 style={{ margin: "0 auto 12px", textAlign: "center" }}>Be our first verified hospital partner</h2>
              <p style={{ color: "var(--text-soft)" }}>
                Hospitals and blood banks can join as partner accounts to verify Critical requests
                and donors in their area.
              </p>
            </>
          )}
        </div>
      </section>

      <footer className="landing-footer">
        <span>
          RaktSetu — Team RaktSetu, SIH26198 · <Link to="/privacy">Privacy Policy</Link>
        </span>
        <span className="landing-footer-sources">
          Sources: Rajya Sabha (2025) · BMJ blood-desert study (2024)
        </span>
      </footer>
    </div>
  );
}

function HowStep({ icon, title, text }) {
  return (
    <div className="how-step">
      <div className="how-step-icon">{icon}</div>
      <h3 style={{ fontSize: "1rem" }}>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function HeroArt() {
  return (
    <div className="landing-art">
      <svg viewBox="0 0 220 220" width="150" height="150">
        <circle cx="110" cy="110" r="100" fill="#FFFFFF" opacity="0.5" />
        <path
          d="M110 40C110 40 60 110 60 148C60 181 82 206 110 206C138 206 160 181 160 148C160 110 110 40 110 40Z"
          fill="#E6364A"
        />
        <path d="M86 150C86 150 86 170 106 176" stroke="#FDE4E8" strokeWidth="6" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}
