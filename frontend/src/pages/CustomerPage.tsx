import { useEffect, useMemo, useRef, useState } from "react";
import ChatPanel from "../components/ChatPanel";
import OrderHistoryPanel from "../components/OrderHistoryPanel";
import { useMyOrders } from "../hooks/useMyOrders";
import { authFetch } from "../lib/auth";
import { streamChat } from "../lib/chatStream";
import { buildDemoScenarios } from "../lib/demoScenarios";
import type { ChatMessage, ThinkingStep } from "../types";

const THINKING_VISIBLE_MS = 8000;

export default function CustomerPage() {
  const { customer, orders, loading: ordersLoading, error: ordersError } = useMyOrders();
  const demoScenarios = useMemo(() => buildDemoScenarios(orders), [orders]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [liveThinking, setLiveThinking] = useState<ThinkingStep[]>([]);
  const hideThinkingTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (hideThinkingTimer.current) clearTimeout(hideThinkingTimer.current);
    };
  }, []);

  const scheduleHideThinking = (messageIndex: number) => {
    if (hideThinkingTimer.current) clearTimeout(hideThinkingTimer.current);
    hideThinkingTimer.current = setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg, i) => (i === messageIndex ? { ...msg, thinkingVisible: false } : msg))
      );
    }, THINKING_VISIBLE_MS);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    setLiveThinking([]);

    try {
      let nextSessionId = sessionId;
      const thinkingSteps: ThinkingStep[] = [];

      await streamChat(
        text,
        sessionId,
        (event) => {
          if (event.type === "start") {
            nextSessionId = event.session_id;
            setSessionId(event.session_id);
          }
          if (event.type === "thinking") {
            thinkingSteps.push(event.step);
            setLiveThinking([...thinkingSteps]);
          }
          if (event.type === "done") {
            const data = event.result;
            nextSessionId = data.session_id;
            setSessionId(data.session_id);
            setMessages((prev) => {
              const next: ChatMessage[] = [
                ...prev,
                {
                  role: "agent",
                  content: data.reply,
                  decision: data.decision ?? undefined,
                  warning: data.warning ?? undefined,
                  thinking: data.thinking?.length ? data.thinking : thinkingSteps,
                  thinkingVisible: true,
                },
              ];
              scheduleHideThinking(next.length - 1);
              return next;
            });
          }
        },
        authFetch
      );
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
      setLiveThinking([]);
    }
  };

  const clearChat = () => {
    if (hideThinkingTimer.current) clearTimeout(hideThinkingTimer.current);
    setMessages([]);
    setSessionId(undefined);
    setLiveThinking([]);
  };

  return (
    <main className="customer-main">
      <ChatPanel
        messages={messages}
        loading={loading}
        liveThinking={liveThinking}
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
