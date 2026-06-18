export interface Customer {
  customer_id: string;
  name: string;
  email: string;
  vip: boolean;
}

export interface UserProfile {
  email: string;
  name: string;
  role: "customer" | "admin";
  customer_id?: string | null;
  vip: boolean;
}

export interface Order {
  order_id: string;
  customer_id: string;
  item_name: string;
  price: number;
  purchase_date: string;
  status: string;
  final_sale: boolean;
}

export interface CustomerWithOrders {
  customer: Customer;
  orders: Order[];
}

export interface SessionSummary {
  turn_id: string;
  session_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  user_message: string;
  reply: string;
  decision?: "approved" | "denied" | "escalated";
  created_at: string;
  total_latency_ms: number;
  retry_count: number;
}

export type TraceCategory = "crm_lookup" | "policy_check" | "decision" | "reasoning";

export interface TraceStep {
  step: number;
  tool: string;
  category: TraceCategory;
  input: Record<string, unknown>;
  output: Record<string, unknown> | string;
  latency_ms: number;
  status: "success" | "error" | "retry";
}

export interface ThinkingStep {
  kind: "reasoning" | "tool";
  label: string;
  text?: string;
  tool?: string;
  detail?: Record<string, unknown>;
  planned_tools?: string[];
  status?: string;
}

export interface RefundEligibility {
  order_id: string;
  eligible: boolean;
  decision: "approved" | "denied" | "escalated";
  reason: string;
  order?: Order;
}

export interface ChatMessage {
  role: "user" | "agent";
  content: string;
  sentAt?: string;
  decision?: "approved" | "denied" | "escalated";
  warning?: string;
  error?: boolean;
}

export interface ChatResponse {
  session_id: string;
  reply: string;
  decision?: "approved" | "denied" | "escalated";
  reason?: string;
  warning?: string;
  trace: TraceStep[];
  token_usage: number;
  total_latency_ms: number;
  retry_count: number;
}

export const CATEGORY_LABELS: Record<TraceCategory, string> = {
  crm_lookup: "Database Lookup",
  policy_check: "Policy Check",
  decision: "Decision",
  reasoning: "Agent Reasoning",
};

export const DEFAULT_PASSWORD = "loopp123";
