import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import StatusPill from "./StatusPill";
import { formatTime } from "../lib/formatDate";
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

function TypingDots() {
  return (
    <span className="chat-typing-dots" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function ThinkingBlock({ steps }: { steps: ThinkingStep[] }) {
  return (
    <div className="chat-thinking">
      <div className="chat-thinking-header">
        <span className="chat-thinking-spinner" aria-hidden="true" />
        <span>Agent reasoning</span>
        {steps.length === 0 && <TypingDots />}
      </div>
      {steps.length === 0 ? (
        <p className="chat-thinking-placeholder">Analyzing your request…</p>
      ) : (
        <ol className="chat-thinking-steps">
          {steps.map((step, i) => (
            <li
              key={`${step.label}-${i}-${step.text?.slice(0, 20) ?? ""}`}
              className={`chat-thinking-step chat-thinking-${step.kind}`}
            >
              <span className="chat-thinking-label">{step.label}</span>
              {step.kind === "reasoning" && step.text && (
                <p className="chat-thinking-text">{step.text}</p>
              )}
              {step.planned_tools && step.planned_tools.length > 0 && (
                <p className="chat-thinking-tools">Tools: {step.planned_tools.join(", ")}</p>
              )}
              {step.kind === "tool" && step.status === "error" && (
                <p className="chat-thinking-error">Step blocked — retrying with policy rules</p>
              )}
            </li>
          ))}
        </ol>
      )}
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

  const showEmpty = messages.length === 0 && !loading;

  return (
    <section className="panel chat-panel anim-panel-in">
      <div className="panel-header chat-panel-header">
        <div className="chat-panel-title">
          <h2>Refund Assistant</h2>
          <span className="panel-tag">AI</span>
        </div>
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
              type="button"
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

      <div className="chat-thread" ref={messagesRef}>
        {showEmpty && (
          <div className="chat-empty">
            <h3>How can I help with your refund?</h3>
            <p>
              {ordersLoading
                ? "Loading your orders…"
                : "Ask about an order from My Orders, or select a scenario above."}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <article key={i} className={`chat-msg chat-msg-${msg.role}`}>
            <div className="chat-msg-label">{msg.role === "user" ? "You" : "Assistant"}</div>
            <div
              className={`chat-msg-body ${msg.error ? "chat-msg-error" : ""} ${msg.warning ? "chat-msg-warning" : ""}`}
            >
              {msg.error && <span className="chat-error-badge">Service unavailable</span>}
              {msg.warning && <span className="warning-badge">Warning</span>}
              <p className="chat-msg-text">{msg.content}</p>
              <div className="chat-msg-footer">
                {msg.decision && (
                  <StatusPill status={msg.decision} className="chat-status-pill" />
                )}
                {msg.sentAt && <time className="chat-msg-time">{formatTime(msg.sentAt)}</time>}
              </div>
            </div>
          </article>
        ))}

        {loading && (
          <article className="chat-msg chat-msg-agent">
            <div className="chat-msg-label">Assistant</div>
            <ThinkingBlock steps={liveThinking} />
          </article>
        )}
      </div>

      <form className="chat-composer" onSubmit={handleSubmit}>
        <div className={`chat-composer-inner ${loading ? "composer-disabled" : ""}`}>
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message…"
            disabled={loading}
            aria-label="Message"
          />
          <button
            type="submit"
            className="chat-send"
            disabled={loading || !input.trim()}
          >
            Send
          </button>
        </div>
        <p className="chat-composer-hint">Enter to send · Shift+Enter for new line</p>
      </form>
    </section>
  );
}
