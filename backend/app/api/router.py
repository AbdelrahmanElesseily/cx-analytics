from __future__ import annotations
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response as FastAPIResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.schemas import QueryRequest, QueryResponse, HealthResponse, SuggestionsResponse, ErrorResponse, ReportRequest
from app.db.database import get_db
from app.services.nl_to_sql import NLToSQLService
from app.services.query_executor import QueryExecutor
from app.services.rag import RAGService
from app.services.report import build_report
from app.core.config import get_settings

logger   = logging.getLogger(__name__)
settings = get_settings()
router   = APIRouter(prefix="/api", tags=["CX Analytics"])

_nlq = NLToSQLService()
_rag = RAGService()

SUGGESTIONS = [
    # NLQ — structured
    "Which channel has the most improvement actions?",
    "What is the average rating per channel?",
    "How many improvement actions were taken in Q3?",
    "Show all feedback with rating 5",
    "Which CX stage has the most issues?",
    "Compare improvement actions between Q1 and Q4",
    "Which service has the most complaints?",
    # RAG — unstructured
    "What did customers say about Live Chat?",
    "Summarize the main themes in Q3 feedback",
    "What are the recurring problems on the Website channel?",
    "Describe the trust issues mentioned in feedback",
    "What improvement actions were planned for billing?",
]


@router.post("/query", response_model=QueryResponse,
             responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}})
async def query(request: QueryRequest, db: AsyncSession = Depends(get_db)):

    # 1 — classify question
    try:
        mode = await _nlq.classify(request.question)
    except Exception:
        mode = "structured"   # fallback

    # 2a — RAG path
    if mode == "unstructured":
        try:
            result = await _rag.answer(request.question)
            return QueryResponse(
                question=request.question,
                mode="rag",
                answer=result["answer"],
                sources=result["sources"],
            )
        except Exception as exc:
            logger.error("RAG failed: %s", exc)
            raise HTTPException(status_code=500, detail=f"RAG error: {exc}")

    # 2b — NLQ path
    try:
        sql = await _nlq.generate_sql(request.question)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("NLQ failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to generate SQL: {exc}")

    try:
        result = await QueryExecutor(db).run(sql)
    except TimeoutError as exc:
        raise HTTPException(status_code=408, detail=str(exc))
    except Exception as exc:
        logger.error("Query failed: %s\nSQL: %s", exc, sql)
        raise HTTPException(status_code=500, detail=f"Query error: {exc}")

    insights = None
    if request.include_insights and result.rows:
        try:
            insights = await _nlq.generate_insights(request.question, result.rows)
        except Exception as exc:
            logger.warning("Insights skipped: %s", exc)

    return QueryResponse(
        question=request.question,
        mode="nlq",
        **result.to_dict(),
        insights=insights,
    )


@router.get("/health", response_model=HealthResponse)
async def health(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "error"

    try:
        _rag._collection.count()
        rag_status = "ok"
    except Exception:
        rag_status = "not seeded"

    return HealthResponse(status="ok", db=db_status, model=settings.github_model, rag=rag_status)


@router.get("/suggestions", response_model=SuggestionsResponse)
async def suggestions():
    return SuggestionsResponse(suggestions=SUGGESTIONS)


@router.post("/report")
async def generate_report(request: ReportRequest):
    try:
        items = [item.model_dump() for item in request.items]
        doc_bytes = build_report(items)
    except Exception as exc:
        logger.error("Report generation failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Report error: {exc}")
    return FastAPIResponse(
        content=doc_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": 'attachment; filename="cx-report.docx"'},
    )
