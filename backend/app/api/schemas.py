from typing import Any
from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question:         str  = Field(..., min_length=3, max_length=1000)
    include_insights: bool = True


class QueryResponse(BaseModel):
    question:    str
    mode:        str
    sql:         str   | None = None
    columns:     list[str]    = []
    rows:        list[dict[str, Any]] = []
    row_count:   int          = 0
    truncated:   bool         = False
    insights:    str   | None = None
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


class ReportSection(BaseModel):
    type:         str = 'finding'   # 'finding' | 'custom'
    question:     str = ''
    mode:         str = ''
    data:         dict[str, Any] = {}
    note:         str = ''
    sectionTitle: str = ''
    content:      str = ''


class CoverPage(BaseModel):
    title:      str = 'CX Analytics Report'
    author:     str = ''
    department: str = ''
    date:       str = ''


class ChartData(BaseModel):
    feedback:     list[dict[str, Any]] = []
    improvements: list[dict[str, Any]] = []


class ReportRequest(BaseModel):
    sections:       list[ReportSection] = []
    cover:          CoverPage           = Field(default_factory=CoverPage)
    include_charts: bool                = True
    chart_data:     ChartData | None    = None
    items:          list[ReportItem]    = []  # legacy fallback
