# CX Analytics — Customer Experience Intelligence Dashboard

> An AI-powered analytics platform for Customer Experience data. Ask questions in plain English, get SQL-driven results or RAG-powered narrative insights — with a one-click Word report generator.

![Stack](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)
![Stack](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Stack](https://img.shields.io/badge/LLM-GPT--4o--mini-412991?style=flat-square&logo=openai)
![Stack](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## Overview

CX Analytics connects two Excel datasets — customer feedback and improvement plans — to an AI assistant that understands natural language. Under the hood it routes every question through a dual-path architecture:

| Question type | Example | Path |
|---|---|---|
| Structured / quantitative | "Which channel has the most actions?" | **NLQ → SQL → SQLite** |
| Unstructured / narrative | "What did customers say about Live Chat?" | **RAG → ChromaDB → GPT-4o-mini** |

Results are shown inside a floating chat bubble. Any answer can be added to a report and downloaded as a formatted **Word (.docx)** document.

---

## Features

- **Natural Language Queries** — GPT-4o-mini converts plain English to SQL for structured data questions
- **RAG-powered insights** — semantic search over feedback text via ChromaDB + sentence-transformers (runs fully local, no API cost)
- **Interactive dashboard** — KPI cards, 6 chart types (bar, donut, horizontal bar), filter panel by quarter / channel / source
- **AI chat bubble** — floating pill UI with NLQ and RAG answer rendering, source citations, and thinking indicator
- **Word report generator** — collect any Q&A pair into a report and download as `.docx` (uses python-docx)
- **Modern light theme** — clean white cards, gradient accents, frosted-glass toolbar

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Recharts, Lucide Icons, CSS Modules |
| Backend | FastAPI, SQLAlchemy (async), SQLite, Uvicorn |
| AI / LLM | GitHub Models API — GPT-4o-mini (OpenAI-compatible) |
| Vector store | ChromaDB (persistent, local) |
| Embeddings | sentence-transformers `all-MiniLM-L6-v2` (local, free) |
| Report generation | python-docx |
| Data ingestion | pandas + openpyxl (reads `.xlsx` files) |

---

## Project Structure

```
cx-analytics/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── router.py          # /api/query, /api/report, /api/health
│   │   │   └── schemas.py         # Pydantic request/response models
│   │   ├── core/
│   │   │   └── config.py          # Settings (env vars)
│   │   ├── db/
│   │   │   └── database.py        # SQLAlchemy async engine
│   │   ├── models/
│   │   │   └── tables.py          # ORM table definitions
│   │   └── services/
│   │       ├── nl_to_sql.py       # NLQ: classify → generate SQL → insights
│   │       ├── rag.py             # RAG: embed → retrieve → generate
│   │       ├── query_executor.py  # Safe async SQL execution
│   │       └── report.py          # Word .docx builder
│   ├── data/
│   │   ├── Value_Moments.xlsx                      # Customer feedback data
│   │   ├── Customer_Journey-Improvement_Plan.xlsx  # Improvement actions data
│   │   ├── cx.db                                   # ← auto-created by seed_db
│   │   └── chroma/                                 # ← auto-created by seed_rag
│   ├── scripts/
│   │   ├── seed_db.py             # Loads Excel → SQLite
│   │   └── seed_rag.py            # Loads Excel → ChromaDB embeddings
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── chat/              # AiChat.jsx — floating AI bubble + report
    │   │   ├── charts/            # ChartsPanel.jsx — 6 Recharts visualisations
    │   │   ├── filters/           # FilterPanel.jsx — sidebar filter chips
    │   │   ├── layout/            # Topbar.jsx, KpiRow.jsx
    │   │   └── table/             # ReservationsTable.jsx
    │   ├── hooks/
    │   │   └── useFilters.js      # Filter state & derived data
    │   └── App.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- A free [GitHub Models](https://github.com/marketplace/models) token (gives access to GPT-4o-mini)

### 1 — Backend

```bash
cd cx-analytics/backend

# Create and activate virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env       # Windows
# cp .env.example .env       # macOS/Linux

# Edit .env and set your GitHub token:
# GITHUB_TOKEN=ghp_your_token_here
```

### 2 — Seed the databases

```bash
# Load Excel data into SQLite
python -m scripts.seed_db

# Build ChromaDB vector store (downloads ~90 MB embedding model on first run)
python -m scripts.seed_rag
```

### 3 — Start the backend

```bash
uvicorn app.main:app --reload --port 8000
```

API docs available at: `http://localhost:8000/docs`  
Health check: `http://localhost:8000/api/health`

### 4 — Frontend

```bash
cd cx-analytics/frontend

npm install
npm run dev
```

Open `http://localhost:5173`

---

## How It Works

```
User types a question in the chat bubble
              │
              ▼
    GPT-4o-mini classifies intent
              │
     ┌────────┴─────────┐
  structured          unstructured
  (count, avg,        (themes, sentiment,
   which, how many)    what did they say)
     │                       │
     ▼                       ▼
 Generate SQL           Query ChromaDB
     │                  (vector search)
     ▼                       │
 Run on SQLite          Retrieve top-6
     │                  relevant chunks
     ▼                       │
  Table result          GPT-4o-mini
  + AI insight          generates answer
     │                  + cites sources
     └────────┬─────────┘
              ▼
     FastAPI  /api/query
              │
              ▼
     React renders result
     in floating chat bubble
              │
              ▼
  User clicks "+ Report"
  → collects Q&A pairs
  → clicks Download .docx
  → formatted Word document
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```env
# GitHub Models API (free tier — get token at github.com/settings/tokens)
GITHUB_TOKEN=ghp_your_token_here
GITHUB_MODEL=gpt-4o-mini

# Database
DATABASE_URL=sqlite+aiosqlite:///./data/cx.db

# ChromaDB
CHROMA_PATH=./data/chroma

# App
APP_ENV=development
APP_PORT=8000
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
MAX_ROWS_RETURNED=500
QUERY_TIMEOUT_SECONDS=30
```

> **Note:** Never commit your `.env` file. It is included in `.gitignore`.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/query` | Run NLQ or RAG query |
| `POST` | `/api/report` | Generate and download `.docx` report |
| `GET` | `/api/health` | Health check (DB + RAG + model) |
| `GET` | `/api/suggestions` | Suggested questions |

### Example request

```bash
curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Which channel has the most improvement actions?", "include_insights": true}'
```

---

## Data Sources

The platform reads two Excel files placed in `backend/data/`:

| File | Description |
|---|---|
| `Value_Moments.xlsx` | Customer feedback entries with ratings, channels, CX stages, quarters |
| `Customer_Journey-Improvement_Plan.xlsx` | Improvement actions with owners, statuses, sources, and timelines |

Both files are loaded into SQLite (for structured queries) and ChromaDB (for semantic search).

---

## License

MIT — free to use, modify, and distribute.
