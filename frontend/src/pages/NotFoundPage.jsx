import { Link, useNavigate } from "react-router-dom";
import { BrandLockup } from "../components/Brand";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";

// Any address we don't have (v2.0): a friendly page instead of a blank screen.
export default function NotFoundPage() {
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();
  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div className="auth-brand" style={{ justifyContent: "center" }}>
          <BrandLockup />
        </div>
        <EmptyState art="broken" title="This bridge doesn't lead anywhere">
          <p className="status">We couldn't find that page. It may have moved, or the link may be mistyped.</p>
        </EmptyState>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" className="ghost" onClick={() => navigate(-1)}>Go back</button>
          <Link to={firebaseUser ? "/dashboard" : "/"} className="btn-primary">{firebaseUser ? "Open dashboard" : "Go to home"}</Link>
          <Link to="/emergency" className="btn-primary btn-danger">Emergency request</Link>
        </div>
      </div>
    </div>
  );
}
