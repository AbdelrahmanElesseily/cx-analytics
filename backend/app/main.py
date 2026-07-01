import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import router
from app.db.database import init_db
from app.core.config import get_settings

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
settings = get_settings()

app = FastAPI(
    title="CX Analytics — NLQ + RAG",
    description="Ask natural language questions about CX operations.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
async def startup():
    await init_db()
    logging.getLogger(__name__).info("CX Analytics ready ✓")


@app.get("/", include_in_schema=False)
async def root():
    return {"service": "CX Analytics", "docs": "/docs", "health": "/api/health"}
