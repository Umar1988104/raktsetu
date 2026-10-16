import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BridgeLoader } from "./Brand";

export default function ProtectedRoute({ children, requireProfile = true }) {
  const { firebaseUser, profile, loading, profileError, refreshProfile } = useAuth();

  if (loading) return <BridgeLoader fullscreen />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (requireProfile && !profile && profileError) {
    return (
      <div className="auth-shell">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <h2>Can't reach RaktSetu right now</h2>
          <p className="status">Your account is fine — the server didn't answer. Check your connection and try again.</p>
          <button onClick={refreshProfile}>Try again</button>
        </div>
      </div>
    );
  }
  if (requireProfile && !profile) return <Navigate to="/complete-profile" replace />;

  return children;
}
