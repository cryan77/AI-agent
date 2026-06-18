import { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "../lib/auth";
import TraceDashboard from "../components/TraceDashboard";
import type { ChatResponse, RunMetrics, SessionSummary } from "../types";

type StatusFilter = "all" | "approved" | "denied" | "escalated" | "pending";

const STATUS_FILTERS: { id: StatusFilter; label: string; badgeClass?: string }[] = [
  { id: "all", label: "All" },
  { id: "approved", label: "Approved", badgeClass: "badge-approved" },
  { id: "denied", label: "Denied", badgeClass: "badge-denied" },
  { id: "escalated", label: "Escalated", badgeClass: "badge-escalated" },
  { id: "pending", label: "Pending", badgeClass: "badge-pending" },
];

const decisionBadge: Record<string, string> = {
  approved: "badge-approved",
  denied: "badge-denied",
  escalated: "badge-escalated",
};

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function sessionStatus(s: SessionSummary): Exclude<StatusFilter, "all"> {
  return s.decision ?? "pending";
}

function statusLabel(s: SessionSummary) {
  const status = sessionStatus(s);
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function AdminPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [trace, setTrace] = useState<ChatResponse | null>(null);
  const [metrics, setMetrics] = useState<RunMetrics>({
    token_usage: 0,
    total_latency_ms: 0,
    retry_count: 0,
  });
  const [loading, setLoading] = useState(false);

  const customers = useMemo(() => {
    const map = new Map<
      string,
      { customer_id: string; customer_name: string; customer_email: string; count: number }
    >();
    for (const s of sessions) {
      const existing = map.get(s.customer_id);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(s.customer_id, {
          customer_id: s.customer_id,
          customer_name: s.customer_name,
          customer_email: s.customer_email,
          count: 1,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.customer_name.localeCompare(b.customer_name));
  }, [sessions]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.customer_id, c.customer_name, c.customer_email].join(" ").toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  const customerSessions = useMemo(() => {
    if (!selectedCustomerId) return [];
    return sessions.filter((s) => s.customer_id === selectedCustomerId);
  }, [sessions, selectedCustomerId]);

  const filteredHistory = useMemo(() => {
    let items = customerSessions;
    if (statusFilter !== "all") {
      items = items.filter((s) => sessionStatus(s) === statusFilter);
    }
    const q = historySearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) =>
      [s.user_message, s.reply, s.decision ?? "pending", s.session_id]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [customerSessions, statusFilter, historySearch]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: customerSessions.length,
      approved: 0,
      denied: 0,
      escalated: 0,
      pending: 0,
    };
    for (const s of customerSessions) {
      counts[sessionStatus(s)] += 1;
    }
    return counts;
  }, [customerSessions]);

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

  const loadTurn = useCallback(async (turnId: string) => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/sessions/${turnId}`);
      if (!res.ok) throw new Error("Chat turn not found");
      const data: ChatResponse = await res.json();
      setTrace(data);
      setMetrics({
        token_usage: data.token_usage,
        total_latency_ms: data.total_latency_ms,
        retry_count: data.retry_count,
      });
      setSelectedTurnId(turnId);
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
    if (filteredCustomers.length === 0) {
      setSelectedCustomerId(null);
      return;
    }
    if (!selectedCustomerId || !filteredCustomers.some((c) => c.customer_id === selectedCustomerId)) {
      setSelectedCustomerId(filteredCustomers[0].customer_id);
    }
  }, [filteredCustomers, selectedCustomerId]);

  useEffect(() => {
    if (filteredHistory.length === 0) {
      setSelectedTurnId(null);
      setTrace(null);
      return;
    }
    if (!selectedTurnId || !filteredHistory.some((s) => s.turn_id === selectedTurnId)) {
      loadTurn(filteredHistory[0].turn_id);
    }
  }, [filteredHistory, selectedTurnId, loadTurn]);

  const selectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setSelectedTurnId(null);
    setTrace(null);
    setHistorySearch("");
    setStatusFilter("all");
  };

  return (
    <main className="admin-main admin-main-history">
      <section className="panel admin-chat-customers anim-panel-in">
        <div className="panel-header">
          <h2>Customers</h2>
          <span className="panel-tag">CRM</span>
        </div>
        <div className="customers-search">
          <input
            type="search"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="Search customers…"
            aria-label="Search customers"
          />
        </div>
        <div className="admin-chat-customer-list">
          {customers.length === 0 && (
            <p className="trace-empty">No customer chats yet.</p>
          )}
          {customers.length > 0 && filteredCustomers.length === 0 && (
            <p className="trace-empty">No customers match your search.</p>
          )}
          {filteredCustomers.map((c) => (
            <button
              key={c.customer_id}
              type="button"
              className={`customer-list-item ${selectedCustomerId === c.customer_id ? "selected" : ""}`}
              onClick={() => selectCustomer(c.customer_id)}
            >
              <span className="customer-list-name">{c.customer_name || c.customer_id}</span>
              <span className="customer-list-meta">
                {c.customer_id}
                · {c.count} message{c.count === 1 ? "" : "s"}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel session-list-panel anim-panel-in">
        <div className="panel-header">
          <h2>Chat history</h2>
          <span className="panel-tag">Live</span>
        </div>
        <div className="customers-search">
          <input
            type="search"
            value={historySearch}
            onChange={(e) => setHistorySearch(e.target.value)}
            placeholder="Search messages…"
            disabled={!selectedCustomerId}
            aria-label="Search chat history"
          />
        </div>
        <div className="history-status-filters">
          {STATUS_FILTERS.map(({ id, label, badgeClass }) => (
            <button
              key={id}
              type="button"
              className={`history-status-chip ${statusFilter === id ? "selected" : ""}`}
              onClick={() => setStatusFilter(id)}
              disabled={!selectedCustomerId}
            >
              {id === "all" ? (
                <span className="history-status-label">{label}</span>
              ) : (
                <span className={`badge ${badgeClass}`}>{label}</span>
              )}
              <span className="history-status-count">{statusCounts[id]}</span>
            </button>
          ))}
        </div>
        <div className="session-list">
          {!selectedCustomerId && (
            <p className="trace-empty">Select a customer to view chat history.</p>
          )}
          {selectedCustomerId && customerSessions.length === 0 && (
            <p className="trace-empty">No messages for this customer.</p>
          )}
          {selectedCustomerId && customerSessions.length > 0 && filteredHistory.length === 0 && (
            <p className="trace-empty">No messages match your filters.</p>
          )}
          {filteredHistory.map((s) => {
            const status = sessionStatus(s);
            const badgeClass = decisionBadge[status] ?? "badge-pending";
            return (
              <button
                key={s.turn_id}
                type="button"
                className={`session-item ${selectedTurnId === s.turn_id ? "selected" : ""}`}
                onClick={() => loadTurn(s.turn_id)}
              >
                <div className="session-item-top">
                  <span className={`badge session-status-badge ${badgeClass}`}>
                    {statusLabel(s)}
                  </span>
                  <span className="session-time">{formatWhen(s.created_at)}</span>
                </div>
                <span className="session-msg">{s.user_message.slice(0, 72)}</span>
                <span className="session-reply">{s.reply.slice(0, 72)}</span>
                <span className="session-meta session-meta-secondary">
                  {s.total_latency_ms.toFixed(0)} ms · {s.retry_count} retr{s.retry_count === 1 ? "y" : "ies"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {loading ? (
        <section className="panel trace-panel anim-panel-in">
          <div className="trace-empty">Loading trace…</div>
        </section>
      ) : (
        <TraceDashboard trace={trace} metrics={metrics} />
      )}
    </main>
  );
}
