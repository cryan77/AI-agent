export interface TraceStep {
  step: number;
  tool: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | string;
  latency_ms: number;
  status: "success" | "error" | "retry";
}

export interface ChatMessage {
  role: "user" | "agent";
  content: string;
  decision?: "approved" | "denied" | "escalated";
}

export interface ChatResponse {
  session_id: string;
  reply: string;
  decision?: "approved" | "denied" | "escalated";
  reason?: string;
  trace: TraceStep[];
  token_usage: number;
  total_latency_ms: number;
  retry_count: number;
}

export interface RunMetrics {
  token_usage: number;
  total_latency_ms: number;
  retry_count: number;
}
