"""Agent tools for refund processing."""

import time
from typing import Annotated, Any

from langchain_core.tools import tool

from app.services.data_loader import data_store

# Session-scoped trace collector (set per request)
_trace_collector: list[dict[str, Any]] = []


def reset_trace() -> None:
    global _trace_collector
    _trace_collector = []


def get_trace() -> list[dict[str, Any]]:
    return _trace_collector


def _record(tool_name: str, tool_input: dict, result: Any, latency_ms: float, status: str = "success") -> Any:
    _trace_collector.append(
        {
            "tool": tool_name,
            "input": tool_input,
            "output": result if isinstance(result, (dict, str)) else str(result),
            "latency_ms": round(latency_ms, 2),
            "status": status,
        }
    )
    return result


@tool
def get_customer(customer_id: Annotated[str, "Customer ID, e.g. C001"]) -> dict:
    """Look up a customer profile by customer ID."""
    start = time.perf_counter()
    customer = data_store.get_customer(customer_id)
    latency = (time.perf_counter() - start) * 1000
    if not customer:
        return _record("get_customer", {"customer_id": customer_id}, {"error": "Customer not found"}, latency, "error")
    result = customer.model_dump()
    return _record("get_customer", {"customer_id": customer_id}, result, latency)


@tool
def get_order(order_id: Annotated[str, "Order ID, e.g. O101"]) -> dict:
    """Look up order details by order ID."""
    start = time.perf_counter()
    order = data_store.get_order(order_id)
    latency = (time.perf_counter() - start) * 1000
    if not order:
        return _record("get_order", {"order_id": order_id}, {"error": "Order not found"}, latency, "error")
    result = order.model_dump()
    return _record("get_order", {"order_id": order_id}, result, latency)


@tool
def get_refund_policy() -> str:
    """Retrieve the full corporate refund policy document."""
    start = time.perf_counter()
    policy = data_store.get_refund_policy()
    latency = (time.perf_counter() - start) * 1000
    return _record("get_refund_policy", {}, {"policy_length": len(policy), "preview": policy[:200] + "..."}, latency)


@tool
def evaluate_order_for_refund(order_id: Annotated[str, "Order ID to evaluate against policy"]) -> dict:
    """Programmatically evaluate an order against refund policy rules. Always call before making a decision."""
    start = time.perf_counter()
    evaluation = data_store.evaluate_refund(order_id)
    latency = (time.perf_counter() - start) * 1000
    return _record("evaluate_order_for_refund", {"order_id": order_id}, evaluation, latency)


@tool
def approve_refund(
    order_id: Annotated[str, "Order ID to approve"],
    reason: Annotated[str, "Reason for approval citing policy rules"],
) -> dict:
    """Approve a refund. Only succeeds if order passes all policy checks."""
    start = time.perf_counter()
    evaluation = data_store.evaluate_refund(order_id)
    latency = (time.perf_counter() - start) * 1000

    if evaluation["decision"] != "approved":
        result = {
            "success": False,
            "blocked": True,
            "message": f"Cannot approve: {evaluation['reason']}",
            "required_decision": evaluation["decision"],
        }
        return _record("approve_refund", {"order_id": order_id, "reason": reason}, result, latency, "error")

    result = {
        "success": True,
        "decision": "approved",
        "order_id": order_id.upper(),
        "reason": reason,
        "message": f"Refund approved for order {order_id.upper()}.",
    }
    return _record("approve_refund", {"order_id": order_id, "reason": reason}, result, latency)


@tool
def deny_refund(
    order_id: Annotated[str, "Order ID to deny"],
    reason: Annotated[str, "Reason for denial citing policy rules"],
) -> dict:
    """Deny a refund request with a policy-based reason."""
    start = time.perf_counter()
    result = {
        "success": True,
        "decision": "denied",
        "order_id": order_id.upper(),
        "reason": reason,
        "message": f"Refund denied for order {order_id.upper()}.",
    }
    latency = (time.perf_counter() - start) * 1000
    return _record("deny_refund", {"order_id": order_id, "reason": reason}, result, latency)


@tool
def escalate_to_human(
    order_id: Annotated[str, "Order ID to escalate"],
    reason: Annotated[str, "Reason for escalation citing policy rules"],
) -> dict:
    """Escalate a refund request to a human agent."""
    start = time.perf_counter()
    result = {
        "success": True,
        "decision": "escalated",
        "order_id": order_id.upper(),
        "reason": reason,
        "message": f"Order {order_id.upper()} escalated to human agent. Response within 24 business hours.",
    }
    latency = (time.perf_counter() - start) * 1000
    return _record("escalate_to_human", {"order_id": order_id, "reason": reason}, result, latency)


ALL_TOOLS = [
    get_customer,
    get_order,
    get_refund_policy,
    evaluate_order_for_refund,
    approve_refund,
    deny_refund,
    escalate_to_human,
]
