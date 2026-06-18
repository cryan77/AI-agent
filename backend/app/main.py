import json
import os
import re
import uuid
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse

from app.agent.graph import RefundAgent
from app.models.schemas import (
    AdminCustomersResponse,
    AuthResponse,
    ChatRequest,
    ChatResponse,
    CustomerWithOrders,
    HealthResponse,
    Order,
    OrderHistoryResponse,
    PolicyResponse,
    RefundEligibilityResponse,
    SessionListResponse,
    SessionSummary,
    SignInRequest,
    UserProfile,
)
from app.services.auth import (
    authenticate_user,
    create_access_token,
    get_current_user,
    require_admin,
    require_customer,
)
from app.services.data_loader import data_store
from app.services.database import init_database
from app.services.openrouter import format_llm_error, validate_api_key
from app.agent.tools import reset_trace, set_request_customer_id
from app.services.session_store import get_session, list_sessions, save_session

load_dotenv()

agent: RefundAgent | None = None

ORDER_ID_PATTERN = re.compile(r"\b(O\d+)\b", re.IGNORECASE)


def _ownership_warning(message: str, customer_id: str) -> str | None:
    for match in ORDER_ID_PATTERN.finditer(message):
        order_id = match.group(1).upper()
        order = data_store.get_order(order_id)
        if order and order.customer_id != customer_id:
            return (
                f"Order {order_id} does not belong to your account. "
                "You can only request refunds for your own orders."
            )
    return None


def _blocked_ownership_result(session_id: str, warning: str) -> dict:
    return {
        "session_id": session_id,
        "reply": warning,
        "decision": "denied",
        "reason": warning,
        "warning": warning,
        "trace": [],
        "thinking": [],
        "token_usage": 0,
        "total_latency_ms": 0,
        "retry_count": 0,
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    global agent
    init_database()
    if not os.getenv("JWT_SECRET"):
        raise RuntimeError("JWT_SECRET environment variable is required")
    api_key = os.getenv("OPENROUTER_API_KEY")
    model = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
    base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    site_url = os.getenv("OPENROUTER_SITE_URL")
    site_name = os.getenv("OPENROUTER_SITE_NAME", "Loopp Refund Agent")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY environment variable is required")
    validate_api_key(api_key, base_url)
    agent = RefundAgent(
        model_name=model,
        api_key=api_key,
        base_url=base_url,
        site_url=site_url,
        site_name=site_name,
    )
    yield


app = FastAPI(title="AI Refund Agent", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", model=os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini"))


@app.get("/policy", response_model=PolicyResponse)
async def get_policy():
    return PolicyResponse(content=data_store.get_refund_policy())


@app.post("/auth/signin", response_model=AuthResponse)
async def signin(request: SignInRequest):
    user = authenticate_user(request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user)
    return AuthResponse(access_token=token, user=user)


@app.get("/auth/me", response_model=UserProfile)
async def me(current: UserProfile = Depends(get_current_user)):
    return current


@app.get("/orders/me", response_model=OrderHistoryResponse)
async def get_my_orders(current: UserProfile = Depends(require_customer)):
    summary = data_store.get_customer_orders_summary(current.customer_id)  # type: ignore[arg-type]
    if not summary:
        raise HTTPException(status_code=404, detail="Customer not found")
    return OrderHistoryResponse(customer=summary["customer"], orders=summary["orders"])


@app.get("/admin/customers", response_model=AdminCustomersResponse)
async def get_admin_customers(_admin: UserProfile = Depends(require_admin)):
    rows = data_store.list_all_customers_with_orders()
    return AdminCustomersResponse(
        customers=[CustomerWithOrders(**row) for row in rows]
    )


@app.get("/admin/orders/{order_id}/refund-eligibility", response_model=RefundEligibilityResponse)
async def get_order_refund_eligibility(
    order_id: str, _admin: UserProfile = Depends(require_admin)
):
    result = data_store.evaluate_refund(order_id)
    if "order" not in result:
        raise HTTPException(status_code=404, detail=result.get("reason", "Order not found"))
    order_data = result["order"]
    return RefundEligibilityResponse(
        order_id=order_id.upper(),
        eligible=result["eligible"],
        decision=result["decision"],
        reason=result["reason"],
        order=Order(**order_data),
    )


@app.get("/sessions", response_model=SessionListResponse)
async def get_sessions(_admin: UserProfile = Depends(require_admin)):
    return SessionListResponse(sessions=[SessionSummary(**s) for s in list_sessions()])


@app.get("/sessions/{session_id}", response_model=ChatResponse)
async def get_session_detail(session_id: str, _admin: UserProfile = Depends(require_admin)):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return ChatResponse(
        session_id=session["session_id"],
        reply=session["reply"],
        decision=session.get("decision"),
        reason=session.get("reason"),
        warning=session.get("warning"),
        trace=session["trace"],
        thinking=session.get("thinking", []),
        token_usage=session["token_usage"],
        total_latency_ms=session["total_latency_ms"],
        retry_count=session["retry_count"],
    )


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, current: UserProfile = Depends(require_customer)):
    if agent is None:
        raise HTTPException(status_code=503, detail="Agent not initialized")

    customer_id = current.customer_id  # type: ignore[assignment]
    warning = _ownership_warning(request.message, customer_id)
    if warning:
        session_id = request.session_id or str(uuid.uuid4())
        result = _blocked_ownership_result(session_id, warning)
        save_session(result, request.message)
        return ChatResponse(**result)

    try:
        set_request_customer_id(customer_id)
        reset_trace()
        result = agent.run(request.message, request.session_id, customer_id=customer_id)
        save_session(result, request.message)
        return ChatResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=502, detail=format_llm_error(e)) from e
    finally:
        set_request_customer_id(None)


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest, current: UserProfile = Depends(require_customer)):
    if agent is None:
        raise HTTPException(status_code=503, detail="Agent not initialized")

    customer_id = current.customer_id  # type: ignore[assignment]
    warning = _ownership_warning(request.message, customer_id)

    def event_stream():
        try:
            if warning:
                session_id = request.session_id or str(uuid.uuid4())
                result = _blocked_ownership_result(session_id, warning)
                save_session(result, request.message)
                yield f"data: {json.dumps({'type': 'done', 'result': result})}\n\n"
                return

            set_request_customer_id(customer_id)
            for event in agent.run_stream(request.message, request.session_id, customer_id=customer_id):
                if event.get("type") == "done":
                    save_session(event["result"], request.message)
                yield f"data: {json.dumps(event, default=str)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'detail': format_llm_error(e)})}\n\n"
        finally:
            set_request_customer_id(None)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
