import type { ChatResponse, ThinkingStep } from "../types";
import { toChatErrorMessage } from "./chatErrors";

type ChatStreamEvent =
  | { type: "start"; session_id: string }
  | { type: "thinking"; step: ThinkingStep }
  | { type: "done"; result: ChatResponse }
  | { type: "error"; detail: string };

export async function streamChat(
  message: string,
  sessionId: string | undefined,
  onEvent: (event: ChatStreamEvent) => void,
  fetchFn: (url: string, options?: RequestInit) => Promise<Response>
): Promise<void> {
  const res = await fetchFn("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    const detail = typeof err.detail === "string" ? err.detail : "Request failed";
    throw new Error(toChatErrorMessage(new Error(detail)));
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Streaming not supported");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data: ")) continue;
      const payload = JSON.parse(line.slice(6)) as ChatStreamEvent;
      onEvent(payload);
      if (payload.type === "error") {
        throw new Error(toChatErrorMessage(new Error(payload.detail)));
      }
    }
  }
}
