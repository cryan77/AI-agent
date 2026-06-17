import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import UserMenu from "./UserMenu";

export default function Layout() {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const navClass = (path: string) =>
    location.pathname === path ? "nav-link active" : "nav-link";

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Loopp Refund Agent</h1>
          <p className="subtitle">AI Customer Support — Policy-Enforced Refund Processing</p>
        </div>
        <nav className="nav">
          {!isAdmin && (
            <>
              <Link to="/" className={navClass("/")}>
                Customer
              </Link>
              <Link to="/policy" className={navClass("/policy")}>
                Refund Policy
              </Link>
            </>
          )}
          {isAdmin && (
            <>
              <Link to="/admin" className={navClass("/admin")}>
                Admin
              </Link>
              <Link to="/customers" className={navClass("/customers")}>
                Customers
              </Link>
              <Link to="/policy" className={navClass("/policy")}>
                Refund Policy
              </Link>
            </>
          )}
          <UserMenu />
        </nav>
      </header>
      <Outlet />
    </div>
  );
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="auth-loading">Loading…</div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function CustomerRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="auth-loading">Loading…</div>;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}
