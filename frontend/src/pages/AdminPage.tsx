import { useCallback, useEffect, useState } from "react";
import { authFetch } from "../lib/auth";
import TraceDashboard from "../components/TraceDashboard";
import type { ChatResponse, RunMetrics, SessionSummary } from "../types";

export default function AdminPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trace, setTrace] = useState<ChatResponse | null>(null);
  const [metrics, setMetrics] = useState<RunMetrics>({
    token_usage: 0,
    total_latency_ms: 0,
    retry_count: 0,
  });
  const [loading, setLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const res = await authFetch("/api/sessions");
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data.sessions);
    } catch {
      /* ignore poll errors */
    }
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/sessions/${sessionId}`);
      if (!res.ok) throw new Error("Session not found");
      const data: ChatResponse = await res.json();
      setTrace(data);
      setMetrics({
        token_usage: data.token_usage,
        total_latency_ms: data.total_latency_ms,
        retry_count: data.retry_count,
      });
      setSelectedId(sessionId);
    } catch {
      setTrace(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 3000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  useEffect(() => {
    if (sessions.length > 0 && !selectedId) {
      loadSession(sessions[0].session_id);
    }
  }, [sessions, selectedId, loadSession]);

  return (
    <main className="admin-main">
      <section className="panel session-list-panel">
        <div className="panel-header">
          <h2>Chat Sessions</h2>
          <span className="panel-tag">Live</span>
        </div>
        <div className="session-list">
          {sessions.length === 0 && (
            <p className="trace-empty">No sessions yet. Customer chats appear here in real time.</p>
          )}
          {sessions.map((s) => (
            <button
              key={s.session_id}
              className={`session-item ${selectedId === s.session_id ? "selected" : ""}`}
              onClick={() => loadSession(s.session_id)}
            >
              <span className="session-msg">{s.user_message.slice(0, 60)}</span>
              <span className="session-meta">
                {s.decision ? s.decision.toUpperCase() : "pending"} · {s.total_latency_ms.toFixed(0)} ms
              </span>
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <section className="panel trace-panel">
          <div className="trace-empty">Loading trace…</div>
        </section>
      ) : (
        <TraceDashboard trace={trace} metrics={metrics} />
      )}
    </main>
  );
}
