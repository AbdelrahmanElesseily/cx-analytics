from __future__ import annotations
import re, logging
from typing import Any
from openai import AsyncOpenAI
from app.core.config import get_settings

logger   = logging.getLogger(__name__)
settings = get_settings()

SCHEMA = """
You are a SQL expert for a Customer Experience (CX) analytics system.

TABLES:
  channels(id, name)
    Examples: 'Website','Contact Centre','WhatsApp & Web Chat','Smart App',
              'Branch CHC','LIVE-CHAT','CSS PORTAL','Social Media','All'

  cx_stages(id, name)
    Values: 'Service Application and Submission','Communication During Procedures',
            'Receiving Service Information','Service Completion','All'

  services(id, name)
    Examples: 'All Services','Bill Payment','Move Out','Move In','WWPR',
              'Owner/Tenant NOC','CSS','CSR'

  feedback(id, year, quarter, source, service_id→services, cx_stage_id→cx_stages,
           channel_id→channels, value_moment, details, value_moment_short,
           rating INTEGER 1-5, created_at)

  improvement_actions(id, year, quarter, source, channel_id→channels,
                      service_id→services, cx_stage_id→cx_stages,
                      problem TEXT, action TEXT, created_at)

RULES:
1. SELECT only — never INSERT/UPDATE/DELETE/DROP/ALTER.
2. Always JOIN to get name columns from lookup tables.
3. Add LIMIT {max_rows} unless user asks for all.
4. Return ONLY raw SQL — no explanation, no markdown fences.
""".strip()

SQL_PROMPT  = "Question: {question}\n\nWrite a single SQL SELECT query. Return ONLY the SQL."
INSIGHT_PROMPT = """
CX analytics expert. User asked: "{question}"
Query returned {count} rows. Sample: {sample}
Write 2-3 bullet-point insights. Be specific with numbers.
""".strip()


class NLToSQLService:
    def __init__(self):
        self._client = AsyncOpenAI(
            base_url=settings.github_base_url,
            api_key=settings.github_token,
        )

    async def generate_sql(self, question: str) -> str:
        resp = await self._client.chat.completions.create(
            model=settings.github_model,
            temperature=0,
            messages=[
                {"role": "system", "content": SCHEMA.format(max_rows=settings.max_rows_returned)},
                {"role": "user",   "content": SQL_PROMPT.format(question=question)},
            ],
        )
        sql = self._clean(resp.choices[0].message.content)
        self._validate(sql)
        return sql

    async def generate_insights(self, question: str, rows: list[dict[str, Any]]) -> str:
        resp = await self._client.chat.completions.create(
            model=settings.github_model,
            temperature=0.3,
            messages=[{"role": "user", "content": INSIGHT_PROMPT.format(
                question=question, count=len(rows), sample=rows[:5]
            )}],
        )
        return resp.choices[0].message.content.strip()

    async def classify(self, question: str) -> str:
        """Returns 'structured' or 'unstructured'."""
        prompt = (
            "Classify this question as either 'structured' or 'unstructured'.\n"
            "structured = count, average, which channel, how many, compare, list by quarter\n"
            "unstructured = summarize, what did customers say, themes, explain, describe, why\n"
            f"Question: {question}\n"
            "Answer with exactly one word: structured or unstructured"
        )
        resp = await self._client.chat.completions.create(
            model=settings.github_model,
            temperature=0,
            messages=[{"role": "user", "content": prompt}],
        )
        answer = resp.choices[0].message.content.strip().lower()
        return "unstructured" if "unstructured" in answer else "structured"

    @staticmethod
    def _clean(raw: str) -> str:
        return re.sub(r'```sql|```', '', raw, flags=re.IGNORECASE).strip()

    @staticmethod
    def _validate(sql: str):
        n = sql.strip().upper()
        if not n.startswith('SELECT'):
            raise ValueError(f"Only SELECT allowed. Got: {sql[:80]}")
        for kw in ['INSERT','UPDATE','DELETE','DROP','ALTER','TRUNCATE','CREATE']:
            if re.search(rf'\b{kw}\b', n):
                raise ValueError(f"Forbidden keyword: {kw}")
