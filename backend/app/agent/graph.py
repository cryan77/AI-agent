"""LangGraph agent for refund processing."""

import time
import uuid
from typing import Annotated, Literal, TypedDict

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from app.agent.prompts import SYSTEM_PROMPT
from app.agent.tools import ALL_TOOLS, get_trace, record_reasoning, reset_trace, set_request_customer_id
from app.models.schemas import TraceStep


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    session_id: str
    decision: str | None
    reason: str | None
    token_usage: int
    retry_count: int


def _extract_decision() -> tuple[str | None, str | None]:
    trace = get_trace()
    for entry in reversed(trace):
        tool = entry["tool"]
        output = entry["output"]
        if tool in ("approve_refund", "deny_refund", "escalate_to_human") and isinstance(output, dict):
            if output.get("success"):
                return output.get("decision"), output.get("reason")
            if output.get("blocked"):
                return output.get("required_decision"), output.get("message")
    return None, None


def _extract_warning() -> str | None:
    trace = get_trace()
    for entry in trace:
        output = entry["output"]
        if isinstance(output, dict) and output.get("error") == "ownership_denied":
            return output.get("message")
    return None


OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


class RefundAgent:
    def __init__(
        self,
        model_name: str,
        api_key: str,
        base_url: str = OPENROUTER_BASE_URL,
        site_url: str | None = None,
        site_name: str | None = None,
    ) -> None:
        default_headers: dict[str, str] = {}
        if site_url:
            default_headers["HTTP-Referer"] = site_url
        if site_name:
            default_headers["X-Title"] = site_name

        self.llm = ChatOpenAI(
            model=model_name,
            api_key=api_key,
            base_url=base_url,
            temperature=0,
            default_headers=default_headers or None,
        )
        self.llm_with_tools = self.llm.bind_tools(ALL_TOOLS)
        self.tool_node = ToolNode(ALL_TOOLS)
        self.graph = self._build_graph()

    def _build_graph(self):
        def agent_node(state: AgentState) -> dict:
            messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
            response = self.llm_with_tools.invoke(messages)
            token_usage = state.get("token_usage", 0)
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                token_usage += response.usage_metadata.get("total_tokens", 0)
            else:
                token_usage += len(str(response.content)) // 4 + 100

            if response.content:
                planned = [tc["name"] for tc in response.tool_calls] if response.tool_calls else []
                record_reasoning(
                    response.content if isinstance(response.content, str) else str(response.content),
                    planned_tools=planned,
                )

            return {"messages": [response], "token_usage": token_usage}

        def should_continue(state: AgentState) -> Literal["tools", "end"]:
            last = state["messages"][-1]
            if isinstance(last, AIMessage) and last.tool_calls:
                return "tools"
            return "end"

        graph = StateGraph(AgentState)
        graph.add_node("agent", agent_node)
        graph.add_node("tools", self.tool_node)
        graph.set_entry_point("agent")
        graph.add_conditional_edges("agent", should_continue, {"tools": "tools", "end": END})
        graph.add_edge("tools", "agent")
        return graph.compile()

    def run(self, message: str, session_id: str | None = None, customer_id: str | None = None) -> dict:
        reset_trace()
        set_request_customer_id(customer_id)
        session_id = session_id or str(uuid.uuid4())
        start = time.perf_counter()
        retry_count = 0

        initial_state: AgentState = {
            "messages": [HumanMessage(content=message)],
            "session_id": session_id,
            "decision": None,
            "reason": None,
            "token_usage": 0,
            "retry_count": 0,
        }

        final_state = self.graph.invoke(initial_state, {"recursion_limit": 15})
        total_latency = (time.perf_counter() - start) * 1000

        # Count retries (blocked approve attempts)
        trace_raw = get_trace()
        retry_count = sum(1 for t in trace_raw if t.get("status") == "error")

        decision, reason = _extract_decision()

        # Get final AI reply
        reply = ""
        for msg in reversed(final_state["messages"]):
            if isinstance(msg, AIMessage) and msg.content and not msg.tool_calls:
                reply = msg.content if isinstance(msg.content, str) else str(msg.content)
                break
        if not reply:
            for msg in reversed(final_state["messages"]):
                if isinstance(msg, AIMessage) and msg.content:
                    reply = msg.content if isinstance(msg.content, str) else str(msg.content)
                    break

        trace_steps = [
            TraceStep(
                step=i + 1,
                tool=t["tool"],
                category=t.get("category", "decision"),
                input=t["input"],
                output=t["output"],
                latency_ms=t["latency_ms"],
                status=t["status"],
            )
            for i, t in enumerate(trace_raw)
        ]

        return {
            "session_id": session_id,
            "reply": reply or "I was unable to process your request. Please provide an order ID.",
            "decision": decision,
            "reason": reason,
            "warning": _extract_warning(),
            "trace": trace_steps,
            "token_usage": final_state.get("token_usage", 0),
            "total_latency_ms": round(total_latency, 2),
            "retry_count": retry_count,
        }
