import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.agent.graph import RefundAgent
from app.services.database import init_database
from app.models.schemas import ChatRequest, ChatResponse, HealthResponse

load_dotenv()

agent: RefundAgent | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global agent
    init_database()
    api_key = os.getenv("OPENROUTER_API_KEY")
    model = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
    base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    site_url = os.getenv("OPENROUTER_SITE_URL")
    site_name = os.getenv("OPENROUTER_SITE_NAME", "Loopp Refund Agent")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY environment variable is required")
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


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if agent is None:
        raise HTTPException(status_code=503, detail="Agent not initialized")
    try:
        result = agent.run(request.message, request.session_id)
        return ChatResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
