from __future__ import annotations
from io import BytesIO
from datetime import date
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH


def build_report(items: list[dict]) -> bytes:
    doc = Document()

    # ── Title ──────────────────────────────────────────────────────────────
    title = doc.add_heading("CX Analytics Report", level=0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER

    sub = doc.add_paragraph(f"Generated: {date.today().strftime('%B %d, %Y')}")
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub.runs[0].font.color.rgb = RGBColor(0x88, 0x88, 0x88)
    sub.runs[0].font.size = Pt(10)

    doc.add_paragraph("")

    for i, item in enumerate(items, 1):
        question = item.get("question", "")
        mode = item.get("mode", "")
        data = item.get("data", {})

        # ── Question heading ────────────────────────────────────────────────
        h = doc.add_heading(f"Q{i}: {question}", level=2)

        # ── RAG answer ──────────────────────────────────────────────────────
        if mode == "rag":
            answer = data.get("answer") or ""
            if answer:
                doc.add_paragraph(answer)

            sources = data.get("sources", [])
            if sources:
                doc.add_heading("Sources", level=3)
                for s in sources[:3]:
                    parts = [s.get("type", ""), s.get("quarter", ""), s.get("channel", "")]
                    label = "  ·  ".join(p for p in parts if p)
                    p = doc.add_paragraph(style="List Bullet")
                    p.add_run(label).bold = True
                    snippet = s.get("snippet", "")
                    if snippet:
                        p.add_run(f":  {snippet}")

        # ── NLQ answer ──────────────────────────────────────────────────────
        elif mode == "nlq":
            insights = data.get("insights") or ""
            if insights:
                doc.add_paragraph(insights)

            rows = data.get("rows", [])
            cols = data.get("columns", [])
            if rows and cols:
                display_rows = rows[:30]
                table = doc.add_table(rows=1 + len(display_rows), cols=len(cols))
                table.style = "Table Grid"

                hdr_cells = table.rows[0].cells
                for j, col in enumerate(cols):
                    hdr_cells[j].text = col
                    hdr_cells[j].paragraphs[0].runs[0].bold = True

                for ri, row in enumerate(display_rows, 1):
                    cells = table.rows[ri].cells
                    for j, col in enumerate(cols):
                        cells[j].text = str(row.get(col, ""))

                if data.get("row_count", 0) > 30:
                    extra = doc.add_paragraph(
                        f"  …and {data['row_count'] - 30} more rows"
                    )
                    extra.runs[0].font.color.rgb = RGBColor(0x88, 0x88, 0x88)
                    extra.runs[0].font.size = Pt(9)

        doc.add_paragraph("")

    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()
