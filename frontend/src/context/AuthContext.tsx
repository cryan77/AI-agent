import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authFetch, clearAuth, getStoredUser, getToken, setAuth } from "../lib/auth";
import type { UserProfile } from "../types";

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserProfile>;
  signOut: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Sign in failed");
    }
    const data = await res.json();
    setAuth(data.access_token, data.user);
    setUser(data.user);
    return data.user as UserProfile;
  }, []);

  useEffect(() => {
    const token = getToken();
    const stored = getStoredUser();
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        clearAuth();
      }
    }
    if (!token) {
      setLoading(false);
      return;
    }
    authFetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Session expired");
        return res.json();
      })
      .then((data) => setUser(data))
      .catch(() => signOut())
      .finally(() => setLoading(false));
  }, [signOut]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
