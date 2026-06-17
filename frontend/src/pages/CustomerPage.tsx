import { useMemo, useState } from "react";
import ChatPanel from "../components/ChatPanel";
import OrderHistoryPanel from "../components/OrderHistoryPanel";
import { useMyOrders } from "../hooks/useMyOrders";
import { authFetch } from "../lib/auth";
import { buildDemoScenarios } from "../lib/demoScenarios";
import type { ChatMessage } from "../types";

export default function CustomerPage() {
  const { customer, orders, loading: ordersLoading, error: ordersError } = useMyOrders();
  const demoScenarios = useMemo(() => buildDemoScenarios(orders), [orders]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await authFetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Request failed");
      }

      const data = await res.json();
      setSessionId(data.session_id);
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: data.reply,
          decision: data.decision ?? undefined,
          warning: data.warning ?? undefined,
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
  };

  return (
    <main className="customer-main">
      <ChatPanel
        messages={messages}
        loading={loading}
        demoScenarios={demoScenarios}
        ordersLoading={ordersLoading}
        onSend={sendMessage}
        onNewSession={clearChat}
      />
      <OrderHistoryPanel
        compact
        customer={customer}
        orders={orders}
        loading={ordersLoading}
        error={ordersError}
      />
    </main>
  );
}
