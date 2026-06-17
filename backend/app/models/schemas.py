from pydantic import BaseModel
from typing import Any, Literal, Optional


class Customer(BaseModel):
    customer_id: str
    name: str
    email: str
    vip: bool


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
    trace: list[TraceStep]
    token_usage: int
    total_latency_ms: float
    retry_count: int


class HealthResponse(BaseModel):
    status: str
    model: str
