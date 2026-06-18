import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_PASSWORD } from "../types";

const DEMO_ACCOUNTS = [
  { email: "admin@email.com", name: "Admin" },
  { email: "jbrown@email.com", name: "James Brown (Customer)" },
  { email: "mchen@email.com", name: "Michael Chen (Customer)" },
  { email: "agarcia@email.com", name: "Amanda Garcia (Customer)" },
  { email: "clee@email.com", name: "Christopher Lee (Customer)" },
  { email: "mwhite@email.com", name: "Michelle White (Customer)" },
  { email: "dharris@email.com", name: "Daniel Harris (Customer)" },
  { email: "jclark@email.com", name: "Jessica Clark (Customer)" },
  { email: "mlewis@email.com", name: "Matthew Lewis (Customer)" },
];

export default function SignInPage() {
  const { signIn, isAuthenticated, user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as { from?: string })?.from;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="signin-layout">
        <SiteHeader />
        <div className="signin-screen">
          <div className="auth-loading">Loading…</div>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    const dest = from || (user.role === "admin" ? "/admin" : "/");
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const signedInUser = await signIn(email.trim(), password);
      const dest = from || (signedInUser.role === "admin" ? "/admin" : "/");
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEFAULT_PASSWORD);
    setError(null);
  };

  return (
    <div className="signin-layout">
      <SiteHeader />
      <div className="signin-screen">
        <section className="panel signin-panel">
          <div className="signin-brand">
            <h2>Sign In</h2>
            <p>Use your CRM email and password</p>
          </div>

          <form className="signin-form" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.smith@email.com"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={DEFAULT_PASSWORD}
                required
              />
            </label>
            <p className="signin-hint">Default password for all CRM users: {DEFAULT_PASSWORD}</p>
            {error && <p className="lookup-error">{error}</p>}
            <button type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="demo-accounts">
            <span className="quick-label">Quick fill:</span>
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                className="quick-btn"
                onClick={() => fillDemo(a.email)}
              >
                {a.name}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
