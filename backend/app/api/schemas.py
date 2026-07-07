from typing import Any
from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question:         str  = Field(..., min_length=3, max_length=1000)
    include_insights: bool = True


class QueryResponse(BaseModel):
    question:    str
    mode:        str          # 'nlq' | 'rag'
    # NLQ fields
    sql:         str   | None = None
    columns:     list[str]    = []
    rows:        list[dict[str, Any]] = []
    row_count:   int          = 0
    truncated:   bool         = False
    insights:    str   | None = None
    # RAG fields
    answer:      str   | None = None
    sources:     list[dict[str, Any]] = []


class HealthResponse(BaseModel):
    status: str
    db:     str
    model:  str
    rag:    str


class SuggestionsResponse(BaseModel):
    suggestions: list[str]


class ErrorResponse(BaseModel):
    error:  str
    detail: str | None = None


class ReportItem(BaseModel):
    question: str
    mode:     str
    data:     dict[str, Any] = {}


class ChartData(BaseModel):
    feedback:     list[dict[str, Any]] = []
    improvements: list[dict[str, Any]] = []


class ReportRequest(BaseModel):
    items:      list[ReportItem] = Field(..., min_length=1)
    chart_data: ChartData | None = None
