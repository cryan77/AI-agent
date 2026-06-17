import { useState } from "react";
import ChatPanel from "./components/ChatPanel";
import TraceDashboard from "./components/TraceDashboard";
import type { ChatMessage, ChatResponse, RunMetrics } from "./types";
import { DEMO_SCENARIOS } from "./types";
import "./App.css";

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [lastTrace, setLastTrace] = useState<ChatResponse | null>(null);
  const [metrics, setMetrics] = useState<RunMetrics>({
    token_usage: 0,
    total_latency_ms: 0,
    retry_count: 0,
  });

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Request failed");
      }

      const data: ChatResponse = await res.json();
      setSessionId(data.session_id);
      setLastTrace(data);
      setMetrics({
        token_usage: data.token_usage,
        total_latency_ms: data.total_latency_ms,
        retry_count: data.retry_count,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: data.reply,
          decision: data.decision ?? undefined,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(undefined);
    setLastTrace(null);
    setMetrics({ token_usage: 0, total_latency_ms: 0, retry_count: 0 });
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Loopp Refund Agent</h1>
          <p className="subtitle">AI Customer Support — Policy-Enforced Refund Processing</p>
        </div>
        <button className="btn-secondary" onClick={clearChat}>
          New Session
        </button>
      </header>

      <div className="quick-prompts">
        <span className="quick-label">Demo scenarios:</span>
        {DEMO_SCENARIOS.map((scenario) => (
          <button
            key={scenario.label}
            className="quick-btn"
            title={scenario.message}
            onClick={() => sendMessage(scenario.message)}
            disabled={loading}
          >
            {scenario.label}
          </button>
        ))}
      </div>

      <main className="main">
        <ChatPanel messages={messages} loading={loading} onSend={sendMessage} />
        <TraceDashboard trace={lastTrace} metrics={metrics} />
      </main>
    </div>
  );
}

export default App;
