import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Droplet } from "lucide-react";
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
          <Link to="/login">Log in</Link>
          <Link to="/signup" className="btn-primary">
            Get started
          </Link>
        </div>
      </nav>

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

        <div className="landing-art">🩸</div>
      </div>
    </div>
  );
}
