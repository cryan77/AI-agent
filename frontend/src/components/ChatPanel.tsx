import { FormEvent, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../types";

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  onSend: (text: string) => void;
}

const decisionBadge: Record<string, string> = {
  approved: "badge-approved",
  denied: "badge-denied",
  escalated: "badge-escalated",
};

export default function ChatPanel({ messages, loading, onSend }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  return (
    <section className="panel chat-panel">
      <div className="panel-header">
        <h2>Customer Chat</h2>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Start a refund request. Try order <strong>O101</strong> (valid), <strong>O102</strong> (final sale), or <strong>O103</strong> (high value).</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-label">{msg.role === "user" ? "Customer" : "Agent"}</div>
            <div className="message-bubble">
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
        <div ref={bottomRef} />
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
