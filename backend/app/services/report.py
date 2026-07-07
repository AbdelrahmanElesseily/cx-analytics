from __future__ import annotations
import io
from collections import defaultdict
from datetime import date

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

# ── Palette (matches frontend) ─────────────────────────────────────────────
_GOLD   = '#B8860B'
_BLUE   = '#2563EB'
_GREEN  = '#059669'
_PURPLE = '#7C3AED'
_AMBER  = '#D97706'
_SLATE  = '#94A3B8'

_STAGE_COLORS = {
    'Service Application and Submission': _BLUE,
    'Communication During Procedures':    _GOLD,
    'Receiving Service Information':       _GREEN,
    'Service Completion':                  _PURPLE,
}

plt.rcParams.update({
    'font.family': 'sans-serif',
    'axes.spines.top': False,
    'axes.spines.right': False,
    'axes.grid': False,
    'figure.facecolor': 'white',
    'axes.facecolor': 'white',
})


def _hbar(ax, names, vals, color, title):
    ax.barh(names, vals, color=color, alpha=0.85)
    ax.set_title(title, fontweight='bold', fontsize=11, pad=10)
    ax.tick_params(axis='y', labelsize=8)
    ax.tick_params(axis='x', labelsize=8)


def _vbar(ax, labels, vals, color, title):
    ax.bar(labels, vals, color=color, alpha=0.85)
    ax.set_title(title, fontweight='bold', fontsize=11, pad=10)
    ax.tick_params(labelsize=9)


def _save(fig) -> bytes:
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=130, bbox_inches='tight')
    plt.close(fig)
    return buf.getvalue()


def _generate_charts(feedback: list, improvements: list) -> list[tuple[str, bytes]]:
    charts: list[tuple[str, bytes]] = []

    # 1. Avg satisfaction by channel
    ch_map: dict = defaultdict(lambda: {'s': 0, 'n': 0})
    for r in feedback:
        ch = r.get('channel') or 'Unknown'
        ch_map[ch]['s'] += r.get('rating', 0)
        ch_map[ch]['n'] += 1
    if ch_map:
        data = sorted([(c, v['s']/v['n']) for c, v in ch_map.items()], key=lambda x: x[1])
        names, vals = zip(*data)
        fig, ax = plt.subplots(figsize=(7, max(2.5, len(names) * 0.45)))
        _hbar(ax, names, vals, _GOLD, 'Avg Satisfaction by Channel')
        ax.set_xlim(0, 5)
        charts.append(('Avg Satisfaction by Channel', _save(fig)))

    # 2. Actions by quarter
    q_map: dict = defaultdict(int)
    for r in improvements:
        q_map[r.get('quarter') or '?'] += 1
    if q_map:
        data_q = sorted(q_map.items())
        qs, counts = zip(*data_q)
        fig, ax = plt.subplots(figsize=(7, 3.2))
        _vbar(ax, qs, counts, _BLUE, 'Improvement Actions by Quarter')
        charts.append(('Improvement Actions by Quarter', _save(fig)))

    # 3. Issues by CX Stage (pie)
    stage_map: dict = defaultdict(int)
    for r in improvements:
        stage_map[r.get('cx_stage') or 'Unknown'] += 1
    if stage_map:
        labels = list(stage_map.keys())
        sizes  = list(stage_map.values())
        colors = [_STAGE_COLORS.get(l, _SLATE) for l in labels]
        fig, ax = plt.subplots(figsize=(7, 4))
        wedges, texts, autotexts = ax.pie(
            sizes, colors=colors, autopct='%1.0f%%',
            startangle=90, pctdistance=0.82,
            wedgeprops={'width': 0.55},
        )
        for t in texts: t.set_fontsize(0)
        for t in autotexts: t.set_fontsize(8)
        ax.legend(wedges, labels, loc='center left', bbox_to_anchor=(1, 0.5), fontsize=8)
        ax.set_title('Issues by CX Stage', fontweight='bold', fontsize=11)
        charts.append(('Issues by CX Stage', _save(fig)))

    # 4. Rating distribution
    rating_map: dict = defaultdict(int)
    for r in feedback:
        rating_map[r.get('rating', 0)] += 1
    if rating_map:
        ratings = sorted(rating_map.keys())
        counts  = [rating_map[r] for r in ratings]
        labels  = [f'★{r}' for r in ratings]
        fig, ax = plt.subplots(figsize=(4.5, 3.2))
        _vbar(ax, labels, counts, _GREEN, 'Feedback Rating Distribution')
        charts.append(('Feedback Rating Distribution', _save(fig)))

    # 5. Actions by channel (top 8)
    chan_map: dict = defaultdict(int)
    for r in improvements:
        chan_map[r.get('channel') or 'Unknown'] += 1
    if chan_map:
        data_c = sorted(chan_map.items(), key=lambda x: x[1])[-8:]
        names, counts = zip(*data_c)
        fig, ax = plt.subplots(figsize=(7, max(2.5, len(names) * 0.45)))
        _hbar(ax, names, counts, _AMBER, 'Improvement Actions by Channel')
        charts.append(('Improvement Actions by Channel', _save(fig)))

    # 6. Actions by source
    src_map: dict = defaultdict(int)
    for r in improvements:
        src = (r.get('source') or 'Unknown').replace(
            'Employee S&F & Contact Center Suggestion', 'Emp+CC'
        )
        src_map[src] += 1
    if src_map:
        data_s = sorted(src_map.items(), key=lambda x: x[1])
        names, counts = zip(*data_s)
        fig, ax = plt.subplots(figsize=(7, max(2.5, len(names) * 0.45)))
        _hbar(ax, names, counts, _GREEN, 'Improvement Actions by Source')
        charts.append(('Improvement Actions by Source', _save(fig)))

    return charts


def build_report(items: list[dict], feedback: list = None, improvements: list = None) -> bytes:
    doc = Document()

    # ── Title page ─────────────────────────────────────────────────────────
    title = doc.add_heading('CX Analytics Report', level=0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER

    sub = doc.add_paragraph(f"Generated: {date.today().strftime('%B %d, %Y')}")
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub.runs[0].font.color.rgb = RGBColor(0x88, 0x88, 0x88)
    sub.runs[0].font.size = Pt(10)

    doc.add_paragraph('')

    # ── Dashboard Charts section ────────────────────────────────────────────
    if feedback or improvements:
        h = doc.add_heading('Dashboard Overview', level=1)
        charts = _generate_charts(feedback or [], improvements or [])
        for title_txt, png_bytes in charts:
            doc.add_heading(title_txt, level=3)
            doc.add_picture(io.BytesIO(png_bytes), width=Inches(5.8))
            doc.add_paragraph('')

        doc.add_page_break()

    # ── AI Chat Q&A section ─────────────────────────────────────────────────
    if items:
        doc.add_heading('AI Assistant Findings', level=1)
        doc.add_paragraph('')

    for i, item in enumerate(items, 1):
        question = item.get('question', '')
        mode     = item.get('mode', '')
        data     = item.get('data', {})

        h = doc.add_heading(f'Q{i}: {question}', level=2)

        if mode == 'rag':
            answer = data.get('answer') or ''
            if answer:
                doc.add_paragraph(answer)
            sources = data.get('sources', [])
            if sources:
                doc.add_heading('Sources', level=3)
                for s in sources[:3]:
                    parts = [s.get('type', ''), s.get('quarter', ''), s.get('channel', '')]
                    label = '  ·  '.join(p for p in parts if p)
                    p = doc.add_paragraph(style='List Bullet')
                    p.add_run(label).bold = True
                    snippet = s.get('snippet', '')
                    if snippet:
                        p.add_run(f':  {snippet}')

        elif mode == 'nlq':
            insights = data.get('insights') or ''
            if insights:
                doc.add_paragraph(insights)
            rows = data.get('rows', [])
            cols = data.get('columns', [])
            if rows and cols:
                display_rows = rows[:30]
                table = doc.add_table(rows=1 + len(display_rows), cols=len(cols))
                table.style = 'Table Grid'
                hdr_cells = table.rows[0].cells
                for j, col in enumerate(cols):
                    hdr_cells[j].text = col
                    hdr_cells[j].paragraphs[0].runs[0].bold = True
                for ri, row in enumerate(display_rows, 1):
                    cells = table.rows[ri].cells
                    for j, col in enumerate(cols):
                        cells[j].text = str(row.get(col, ''))
                if data.get('row_count', 0) > 30:
                    extra = doc.add_paragraph(f'  …and {data["row_count"] - 30} more rows')
                    extra.runs[0].font.color.rgb = RGBColor(0x88, 0x88, 0x88)
                    extra.runs[0].font.size = Pt(9)

        doc.add_paragraph('')

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()
