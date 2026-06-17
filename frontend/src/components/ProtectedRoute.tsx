import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="signin-screen"><div className="auth-loading">Loading…</div></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
