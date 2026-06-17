from pydantic import BaseModel
from typing import Any, Literal, Optional


class Customer(BaseModel):
    customer_id: str
    name: str
    email: str
    vip: bool


class UserProfile(BaseModel):
    email: str
    name: str
    role: Literal["customer", "admin"]
    customer_id: Optional[str] = None
    vip: bool = False


class Order(BaseModel):
    order_id: str
    customer_id: str
    item_name: str
    price: float
    purchase_date: str
    status: str
    final_sale: bool


class TraceStep(BaseModel):
    step: int
    tool: str
    category: Literal["crm_lookup", "policy_check", "decision", "reasoning"] = "decision"
    input: dict[str, Any]
    output: dict[str, Any] | str
    latency_ms: float
    status: Literal["success", "error", "retry"] = "success"


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    decision: Optional[Literal["approved", "denied", "escalated"]] = None
    reason: Optional[str] = None
    warning: Optional[str] = None
    trace: list[TraceStep]
    token_usage: int
    total_latency_ms: float
    retry_count: int


class HealthResponse(BaseModel):
    status: str
    model: str


class PolicyResponse(BaseModel):
    content: str


class OrderHistoryResponse(BaseModel):
    customer: Customer
    orders: list[Order]


class CustomerListResponse(BaseModel):
    customers: list[Customer]


class CustomerWithOrders(BaseModel):
    customer: Customer
    orders: list[Order]


class AdminCustomersResponse(BaseModel):
    customers: list[CustomerWithOrders]


class SignInRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


class SessionSummary(BaseModel):
    session_id: str
    user_message: str
    decision: Optional[Literal["approved", "denied", "escalated"]] = None
    created_at: str
    total_latency_ms: float
    retry_count: int


class SessionListResponse(BaseModel):
    sessions: list[SessionSummary]
