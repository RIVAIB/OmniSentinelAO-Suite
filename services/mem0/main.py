# services/mem0/main.py
# mem0 REST API server for OmniSentinel — based on official mem0ai server.
# Modifications applied:
#   A) /health endpoint added
#   B) CORS allow_origins=["*"] for local/Docker deployment
#   C) DEFAULT_CONFIG uses pgvector → Supabase (env-driven, no Neo4j)

import os
import logging
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from mem0 import Memory

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Mem0 Memory Service", version="1.0.0")

# ── Modification B: CORS — allow all origins (OK for local/Docker) ────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # OK for local/Docker deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Modification C: DEFAULT_CONFIG with pgvector → Supabase ──────────────────
DEFAULT_CONFIG = {
    "vector_store": {
        "provider": "pgvector",
        "config": {
            "url": os.environ.get("DATABASE_URL"),  # Supabase direct connection
            "collection_name": "memories",
            "embedding_model_dims": 1536,
        }
    },
    "llm": {
        "provider": "openai",
        "config": {
            "model": "gpt-4o-mini",
            "api_key": os.environ.get("OPENAI_API_KEY", ""),
        }
    },
    "embedder": {
        "provider": "openai",
        "config": {
            "model": "text-embedding-3-small",
            "api_key": os.environ.get("OPENAI_API_KEY", ""),
        }
    },
    "history_db_path": os.environ.get("HISTORY_DB_PATH", "/app/history/history.db"),
}

# Initialize memory once at startup
memory = Memory.from_config(DEFAULT_CONFIG)


# ── Pydantic models ───────────────────────────────────────────────────────────

class Message(BaseModel):
    role: str
    content: str

class MemoryCreate(BaseModel):
    messages: List[Message]
    user_id: Optional[str] = None
    agent_id: Optional[str] = None
    run_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class MemorySearch(BaseModel):
    query: str
    user_id: Optional[str] = None
    agent_id: Optional[str] = None
    run_id: Optional[str] = None
    limit: Optional[int] = 5

class MemoryUpdate(BaseModel):
    memory: str

class ConfigUpdate(BaseModel):
    config: Dict[str, Any]


# ── Modification A: /health endpoint ─────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}


# ── CRUD endpoints ────────────────────────────────────────────────────────────

@app.post("/memories")
async def create_memories(request: MemoryCreate):
    try:
        params: Dict[str, Any] = {}
        if request.user_id:
            params["user_id"] = request.user_id
        if request.agent_id:
            params["agent_id"] = request.agent_id
        if request.run_id:
            params["run_id"] = request.run_id
        if request.metadata:
            params["metadata"] = request.metadata

        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        result = memory.add(messages, **params)
        return result
    except Exception as e:
        logger.error(f"Error creating memories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/memories")
async def get_memories(
    user_id: Optional[str] = None,
    agent_id: Optional[str] = None,
    run_id: Optional[str] = None,
):
    try:
        params: Dict[str, Any] = {}
        if user_id:
            params["user_id"] = user_id
        if agent_id:
            params["agent_id"] = agent_id
        if run_id:
            params["run_id"] = run_id

        result = memory.get_all(**params)
        return {"results": result}
    except Exception as e:
        logger.error(f"Error getting memories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search")
async def search_memories(request: MemorySearch):
    try:
        params: Dict[str, Any] = {"limit": request.limit or 5}
        if request.user_id:
            params["user_id"] = request.user_id
        if request.agent_id:
            params["agent_id"] = request.agent_id
        if request.run_id:
            params["run_id"] = request.run_id

        results = memory.search(request.query, **params)
        return {"results": results}
    except Exception as e:
        logger.error(f"Error searching memories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/memories/{memory_id}")
async def update_memory(memory_id: str, request: MemoryUpdate):
    try:
        result = memory.update(memory_id, request.memory)
        return result
    except Exception as e:
        logger.error(f"Error updating memory {memory_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/memories")
async def delete_memories(
    user_id: Optional[str] = None,
    agent_id: Optional[str] = None,
    run_id: Optional[str] = None,
    memory_id: Optional[str] = None,
):
    try:
        if memory_id:
            memory.delete(memory_id)
        else:
            params: Dict[str, Any] = {}
            if user_id:
                params["user_id"] = user_id
            if agent_id:
                params["agent_id"] = agent_id
            if run_id:
                params["run_id"] = run_id
            memory.delete_all(**params)
        return {"message": "Memories deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting memories: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/memories/{memory_id}/history")
async def get_memory_history(memory_id: str):
    try:
        result = memory.history(memory_id)
        return {"history": result}
    except Exception as e:
        logger.error(f"Error getting memory history {memory_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/configure")
async def configure(request: ConfigUpdate):
    global memory
    try:
        memory = Memory.from_config(request.config)
        return {"message": "Configuration updated successfully"}
    except Exception as e:
        logger.error(f"Error configuring memory: {e}")
        raise HTTPException(status_code=500, detail=str(e))
