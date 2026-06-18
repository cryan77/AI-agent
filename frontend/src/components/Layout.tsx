import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "./BrandLogo";
import UserMenu from "./UserMenu";

export default function Layout() {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const navClass = (path: string) =>
    location.pathname === path ? "nav-link active" : "nav-link";

  return (
    <div className="wm-shell">
      <header className="wm-header">
        <div className="wm-header-inner">
          <BrandLogo />
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
        </div>
      </header>
      <div className="app">
        <Outlet />
      </div>
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
