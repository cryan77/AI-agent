import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import type { DemoScenario } from "../lib/demoScenarios";
import type { ChatMessage, ThinkingStep } from "../types";

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  liveThinking: ThinkingStep[];
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

function ThinkingBlock({
  steps,
  live = false,
  fading = false,
}: {
  steps: ThinkingStep[];
  live?: boolean;
  fading?: boolean;
}) {
  if (steps.length === 0) return null;

  return (
    <div className={`agent-thinking ${live ? "agent-thinking-live" : ""} ${fading ? "agent-thinking-fade" : ""}`}>
      <div className="agent-thinking-header">
        {live ? (
          <>
            <span className="agent-thinking-spinner" aria-hidden="true" />
            <span>Thinking…</span>
          </>
        ) : (
          <span>Worked through {steps.length} step{steps.length === 1 ? "" : "s"}</span>
        )}
      </div>
      <ol className="agent-thinking-steps">
        {steps.map((step, i) => (
          <li key={`${step.label}-${i}`} className={`agent-thinking-step agent-thinking-${step.kind}`}>
            <span className="agent-thinking-label">{step.label}</span>
            {step.kind === "reasoning" && step.text && (
              <p className="agent-thinking-text">{step.text}</p>
            )}
            {step.planned_tools && step.planned_tools.length > 0 && (
              <p className="agent-thinking-tools">Tools: {step.planned_tools.join(", ")}</p>
            )}
            {step.kind === "tool" && step.status === "error" && (
              <p className="agent-thinking-error">Step blocked — retrying with policy rules</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function ChatPanel({
  messages,
  loading,
  liveThinking,
  demoScenarios,
  ordersLoading = false,
  onSend,
  onNewSession,
}: Props) {
  const [input, setInput] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading, liveThinking]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSend(input);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || loading) return;
      onSend(input);
      setInput("");
    }
  };

  return (
    <section className="panel chat-panel chat-gpt">
      <div className="chat-gpt-toolbar">
        <h2>Refund Assistant</h2>
        <button type="button" className="btn-secondary btn-sm" onClick={onNewSession}>
          New chat
        </button>
      </div>

      {demoScenarios.length > 0 && (
        <div className="chat-demo-prompts">
          <span className="quick-label">Try:</span>
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

      <div className="chat-gpt-body" ref={messagesRef}>
        {messages.length === 0 && !loading && (
          <div className="chat-gpt-welcome">
            <h3>How can I help with your refund?</h3>
            <p>
              {ordersLoading
                ? "Loading your orders…"
                : "Ask about an order from My Orders, or pick a demo scenario above."}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-turn chat-turn-${msg.role}`}>
            <div className="chat-turn-avatar" aria-hidden="true">
              {msg.role === "user" ? "You" : "AI"}
            </div>
            <div className="chat-turn-content">
              {msg.role === "agent" && msg.thinkingVisible && msg.thinking && msg.thinking.length > 0 && (
                <ThinkingBlock steps={msg.thinking} fading={!loading} />
              )}
              <div className={`chat-turn-message ${msg.warning ? "message-warning" : ""}`}>
                {msg.warning && <span className="warning-badge">Warning</span>}
                <div className="chat-turn-text">{msg.content}</div>
                {msg.decision && (
                  <span className={`badge ${decisionBadge[msg.decision]}`}>{msg.decision.toUpperCase()}</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-turn chat-turn-agent">
            <div className="chat-turn-avatar" aria-hidden="true">
              AI
            </div>
            <div className="chat-turn-content">
              <ThinkingBlock steps={liveThinking} live />
              {liveThinking.length === 0 && (
                <div className="chat-turn-message chat-turn-pending">
                  <span className="agent-thinking-spinner" aria-hidden="true" />
                  Starting analysis…
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <form className="chat-gpt-composer" onSubmit={handleSubmit}>
        <div className="chat-gpt-composer-inner">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Refund Assistant…"
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()} aria-label="Send message">
            Send
          </button>
        </div>
        <p className="chat-gpt-hint">Enter to send · Shift+Enter for new line</p>
      </form>
    </section>
  );
}
