import { FormEvent, useEffect, useRef, useState } from "react";
import type { DemoScenario } from "../lib/demoScenarios";
import type { ChatMessage } from "../types";

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  demoScenarios: DemoScenario[];
  ordersLoading?: boolean;
  onSend: (text: string) => void;
  onNewSession: () => void;
}

const decisionBadge: Record<string, string> = {
  approved: "badge-approved",
  denied: "badge-denied",
  escalated: "badge-escalated",
};

export default function ChatPanel({
  messages,
  loading,
  demoScenarios,
  ordersLoading = false,
  onSend,
  onNewSession,
}: Props) {
  const [input, setInput] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  return (
    <section className="panel chat-panel">
      <div className="panel-header chat-panel-header">
        <h2>Customer Chat</h2>
        <button type="button" className="btn-secondary btn-sm" onClick={onNewSession}>
          New Session
        </button>
      </div>

      {demoScenarios.length > 0 && (
        <div className="chat-demo-prompts">
          <span className="quick-label">Demo scenarios:</span>
          {demoScenarios.map((scenario) => (
            <button
              key={scenario.label}
              className="quick-btn"
              title={scenario.message}
              onClick={() => onSend(scenario.message)}
              disabled={loading || ordersLoading}
            >
              {scenario.label}
            </button>
          ))}
        </div>
      )}

      <div className="chat-messages" ref={messagesRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>
              {ordersLoading
                ? "Loading your orders…"
                : "Start a refund request using an order from My Orders, or try a demo scenario above."}
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-label">{msg.role === "user" ? "Customer" : "Agent"}</div>
            <div className={`message-bubble ${msg.warning ? "message-warning" : ""}`}>
              {msg.warning && <span className="warning-badge">Warning</span>}
              {msg.content}
              {msg.decision && (
                <span className={`badge ${decisionBadge[msg.decision]}`}>{msg.decision.toUpperCase()}</span>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message agent">
            <div className="message-label">Agent</div>
            <div className="message-bubble loading-dots">Processing</div>
          </div>
        )}
      </div>

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your refund request…"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
