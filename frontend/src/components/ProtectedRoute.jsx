import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, requireProfile = true }) {
  const { firebaseUser, profile, loading } = useAuth();

  if (loading) return <p className="loading">Loading...</p>;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (requireProfile && !profile) return <Navigate to="/complete-profile" replace />;

  return children;
}
