from __future__ import annotations
import asyncio, logging
from typing import Any
from decimal import Decimal
from datetime import date, datetime
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import get_settings

logger   = logging.getLogger(__name__)
settings = get_settings()


class QueryResult:
    def __init__(self, columns, rows, row_count, sql, truncated=False):
        self.columns   = columns
        self.rows      = rows
        self.row_count = row_count
        self.sql       = sql
        self.truncated = truncated

    def to_dict(self):
        return dict(columns=self.columns, rows=self.rows,
                    row_count=self.row_count, sql=self.sql, truncated=self.truncated)


class QueryExecutor:
    def __init__(self, db: AsyncSession):
        self._db = db

    async def run(self, sql: str) -> QueryResult:
        try:
            return await asyncio.wait_for(self._execute(sql), timeout=settings.query_timeout_seconds)
        except asyncio.TimeoutError:
            raise TimeoutError(f"Query exceeded {settings.query_timeout_seconds}s")

    async def _execute(self, sql: str) -> QueryResult:
        cursor  = await self._db.execute(text(sql))
        columns = list(cursor.keys())
        raw     = cursor.fetchall()
        truncated = len(raw) > settings.max_rows_returned
        rows    = raw[:settings.max_rows_returned]
        return QueryResult(
            columns=columns,
            rows=[{c: self._s(v) for c, v in zip(columns, r)} for r in rows],
            row_count=len(rows),
            sql=sql,
            truncated=truncated,
        )

    @staticmethod
    def _s(v: Any) -> Any:
        if isinstance(v, Decimal):       return float(v)
        if isinstance(v, (date, datetime)): return v.isoformat()
        return v
