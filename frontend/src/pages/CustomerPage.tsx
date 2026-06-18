import { useMemo, useState } from "react";
import ChatPanel from "../components/ChatPanel";
import OrderHistoryPanel from "../components/OrderHistoryPanel";
import { useMyOrders } from "../hooks/useMyOrders";
import { authFetch } from "../lib/auth";
import { toChatErrorMessage } from "../lib/chatErrors";
import { streamChat } from "../lib/chatStream";
import { buildDemoScenarios } from "../lib/demoScenarios";
import type { ChatMessage, ThinkingStep } from "../types";

export default function CustomerPage() {
  const { customer, orders, loading: ordersLoading, error: ordersError } = useMyOrders();
  const demoScenarios = useMemo(() => buildDemoScenarios(orders), [orders]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [liveThinking, setLiveThinking] = useState<ThinkingStep[]>([]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text, sentAt: new Date().toISOString() }]);
    setLoading(true);
    setLiveThinking([]);

    try {
      const thinkingSteps: ThinkingStep[] = [];

      await streamChat(
        text,
        sessionId,
        (event) => {
          if (event.type === "start") {
            setSessionId(event.session_id);
          }
          if (event.type === "thinking") {
            thinkingSteps.push(event.step);
            setLiveThinking([...thinkingSteps]);
          }
          if (event.type === "done") {
            const data = event.result;
            setSessionId(data.session_id);
            setLiveThinking([]);
            setLoading(false);
            setMessages((prev) => [
              ...prev,
              {
                role: "agent",
                content: data.reply,
                sentAt: new Date().toISOString(),
                decision: data.decision ?? undefined,
                warning: data.warning ?? undefined,
              },
            ]);
          }
        },
        authFetch
      );
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: toChatErrorMessage(err),
          sentAt: new Date().toISOString(),
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
      setLiveThinking([]);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSessionId(undefined);
    setLiveThinking([]);
  };

  return (
    <main className="customer-main">
      <OrderHistoryPanel
        compact
        customer={customer}
        orders={orders}
        loading={ordersLoading}
        error={ordersError}
      />
      <ChatPanel
        messages={messages}
        loading={loading}
        liveThinking={liveThinking}
        demoScenarios={demoScenarios}
        ordersLoading={ordersLoading}
        onSend={sendMessage}
        onNewSession={clearChat}
      />
    </main>
  );
}
