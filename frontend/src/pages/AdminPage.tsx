import { useCallback, useEffect, useMemo, useState } from "react";
import CustomerSearchInput from "../components/CustomerSearchInput";
import { IconSearch } from "../components/icons/SidebarIcons";
import StatusPill from "../components/StatusPill";
import TraceDashboard from "../components/TraceDashboard";
import { authFetch } from "../lib/auth";
import { GENERAL_BADGE } from "../lib/decisionBadge";
import { customerInitials } from "../lib/customerInitials";
import { formatDateTime } from "../lib/formatDate";
import { filterByQuery } from "../lib/search";
import type { ChatResponse, SessionSummary } from "../types";

type StatusFilter = "all" | "approved" | "denied" | "escalated" | "general";

const STATUS_FILTERS: { id: StatusFilter; label: string; pillClass?: string }[] = [
  { id: "all", label: "All" },
  { id: "approved", label: "Approved", pillClass: "badge-approved" },
  { id: "denied", label: "Denied", pillClass: "badge-denied" },
  { id: "escalated", label: "Escalated", pillClass: "badge-escalated" },
  { id: "general", label: "General", pillClass: GENERAL_BADGE },
];

function sessionStatus(s: SessionSummary): Exclude<StatusFilter, "all"> {
  return s.decision ?? "general";
}

export default function AdminPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedTurnId, setSelectedTurnId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [trace, setTrace] = useState<ChatResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const customers = useMemo(() => {
    const map = new Map<
      string,
      {
        customer_id: string;
        customer_name: string;
        customer_email: string;
        count: number;
        last_message: string;
        last_at: string;
      }
    >();
    for (const s of sessions) {
      const existing = map.get(s.customer_id);
      if (existing) {
        existing.count += 1;
        if (s.created_at > existing.last_at) {
          existing.last_message = s.user_message;
          existing.last_at = s.created_at;
        }
      } else {
        map.set(s.customer_id, {
          customer_id: s.customer_id,
          customer_name: s.customer_name,
          customer_email: s.customer_email,
          count: 1,
          last_message: s.user_message,
          last_at: s.created_at,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.customer_name.localeCompare(b.customer_name));
  }, [sessions]);

  const filteredCustomers = useMemo(
    () =>
      filterByQuery(
        customers,
        (c) => [c.customer_id, c.customer_name, c.customer_email].join(" "),
        customerSearch
      ),
    [customers, customerSearch]
  );

  const customerSessions = useMemo(() => {
    if (!selectedCustomerId) return [];
    return sessions.filter((s) => s.customer_id === selectedCustomerId);
  }, [sessions, selectedCustomerId]);

  const filteredHistory = useMemo(() => {
    let items = customerSessions;
    if (statusFilter !== "all") {
      items = items.filter((s) => sessionStatus(s) === statusFilter);
    }
    return filterByQuery(
      items,
      (s) => [s.user_message, s.reply, s.decision ?? "general", s.session_id].join(" "),
      historySearch
    );
  }, [customerSessions, statusFilter, historySearch]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: customerSessions.length,
      approved: 0,
      denied: 0,
      escalated: 0,
      general: 0,
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
      <section className="panel admin-customers-rail anim-panel-in">
        <div className="chat-sidebar-top">
          <div className="chat-sidebar-inbox">
            <div className="chat-sidebar-head">
              <h2>Customers</h2>
              <span className="chat-inbox-tag">Inbox</span>
            </div>
            <label className="chat-search-field">
              <IconSearch />
              <input
                type="search"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customers"
                aria-label="Search customers"
              />
            </label>
          </div>
        </div>

        <div className="chat-user-list">
          {customers.length === 0 && (
            <p className="chat-sidebar-empty">No customer chats yet.</p>
          )}
          {customers.length > 0 && filteredCustomers.length === 0 && (
            <p className="chat-sidebar-empty">No customers match your search.</p>
          )}
          {filteredCustomers.map((c) => (
            <button
              key={c.customer_id}
              type="button"
              title={c.customer_name || c.customer_id}
              className={`chat-user-item ${selectedCustomerId === c.customer_id ? "selected" : ""}`}
              onClick={() => selectCustomer(c.customer_id)}
            >
              <div className="chat-sidebar-rail">
                <span className="customer-avatar" aria-hidden="true">
                  {customerInitials(c.customer_name, c.customer_id)}
                </span>
              </div>
              <div className="chat-sidebar-main chat-user-body">
                <div className="chat-user-top">
                  <span className="chat-user-name">{c.customer_name || c.customer_id}</span>
                  <span className="chat-user-count">{c.count}</span>
                </div>
                <p className="chat-user-preview">
                  {c.last_message.slice(0, 48)}
                  {c.last_message.length > 48 ? "…" : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="panel session-list-panel anim-panel-in">
        <div className="panel-header">
          <h2>Chat history</h2>
          <span className="panel-tag">Live</span>
        </div>
        <CustomerSearchInput
          value={historySearch}
          onChange={setHistorySearch}
          placeholder="Search messages…"
          disabled={!selectedCustomerId}
          aria-label="Search chat history"
        />
        <div className="history-status-filters">
          {STATUS_FILTERS.map(({ id, label, pillClass }) => (
            <button
              key={id}
              type="button"
              title={label}
              className={`history-status-chip ${pillClass ?? ""} ${statusFilter === id ? "selected" : ""}`}
              onClick={() => setStatusFilter(id)}
              disabled={!selectedCustomerId}
            >
              <span className="history-status-label">{label}</span>
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
          {filteredHistory.map((s) => (
            <button
              key={s.turn_id}
              type="button"
              className={`session-item ${selectedTurnId === s.turn_id ? "selected" : ""}`}
              onClick={() => loadTurn(s.turn_id)}
            >
              <div className="session-item-top">
                {s.decision ? (
                  <StatusPill status={s.decision} className="session-status-pill" />
                ) : (
                  <span className="session-chat-label">General chat</span>
                )}
                <span className="session-time">{formatDateTime(s.created_at)}</span>
              </div>
                <span className="session-msg">{s.user_message.slice(0, 72)}</span>
                <span className="session-reply">{s.reply.slice(0, 72)}</span>
                <span className="session-meta session-meta-secondary">
                  {s.total_latency_ms.toFixed(0)} ms · {s.retry_count} retr{s.retry_count === 1 ? "y" : "ies"}
                </span>
              </button>
          ))}
        </div>
      </section>

      {loading ? (
        <section className="panel trace-panel anim-panel-in">
          <div className="trace-empty">Loading trace…</div>
        </section>
      ) : (
        <TraceDashboard trace={trace} />
      )}
    </main>
  );
}
