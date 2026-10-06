# CX Analytics: Project Guide for the Team

This guide is for anyone joining the project. It covers what the app does, how it is built, how to run it on your machine, and what each part of the code does. Read it from top to bottom the first time. After that, use the table of contents to jump around.

> For a shorter overview, see [README.md](README.md).

---

## Table of Contents

1. [What is this project?](#1-what-is-this-project)
2. [Key terms](#2-key-terms)
3. [Architecture at a glance](#3-architecture-at-a-glance)
4. [Prerequisites](#4-prerequisites)
5. [First-time setup (step by step)](#5-first-time-setup-step-by-step)
6. [Running the project every day](#6-running-the-project-every-day)
7. [Using the app](#7-using-the-app)
8. [How it works, step by step](#8-how-it-works-step-by-step)
9. [Folder and file walkthrough](#9-folder-and-file-walkthrough)
10. [Database schema](#10-database-schema)
11. [API reference](#11-api-reference)
12. [Configuration (.env)](#12-configuration-env)
13. [Common tasks (how do I…?)](#13-common-tasks-how-do-i)
14. [Troubleshooting](#14-troubleshooting)
15. [Known limitations and gotchas](#15-known-limitations-and-gotchas)

---

## 1. What is this project?

**CX Analytics** is a web dashboard for **Customer Experience (CX)** data. It reads two Excel files:

| File | Contains |
|---|---|
| `backend/data/Value_Moments.xlsx` | Customer **feedback**: what customers said, the channel, the CX stage, the quarter, and a rating from 1 to 5 |
| `backend/data/Customer_Journey-Improvement_Plan.xlsx` | **Improvement actions**: the problem found, the action taken, the channel, the service, and the quarter |

The app has three main features:

1. **Dashboard:** KPI cards, charts, a data table, and a filter sidebar (quarter, source, channel, CX stage, service, rating).
2. **AI chat assistant:** you ask a question in plain English and the AI answers it in one of two ways:
   - **Numbers questions** such as *"Which channel has the most actions?"*: the AI writes SQL, runs it on the database, and returns a table, a chart, and insights.
   - **Text questions** such as *"What did customers say about Live Chat?"*: the AI searches the feedback text and writes a summary with sources.
3. **Report builder:** you add chat answers and charts to a report, edit it, and download it as a **Word (.docx)** file.

---

## 2. Key terms

| Term | Meaning |
|---|---|
| **Frontend** | The part you see in the browser. Built with **React** and **Vite**, in the `frontend/` folder. |
| **Backend** | The Python server that talks to the database and the AI. Built with **FastAPI**, in the `backend/` folder. |
| **API** | The URLs the frontend calls on the backend, such as `POST /api/query`. |
| **NLQ** (Natural Language Query) | Turning an English question into **SQL** so a database can answer it. |
| **SQL / SQLite** | SQL is the database query language. SQLite is a small database stored in one file (`backend/data/cx.db`). |
| **RAG** (Retrieval-Augmented Generation) | First **find** the relevant text pieces, then give them to the AI so it answers **from your data** rather than from its general knowledge. |
| **Embedding** | A list of numbers that represents the meaning of a text, so texts with similar meanings can be found. |
| **ChromaDB** | The local database that stores the embeddings (`backend/data/chroma/`). |
| **LLM** | Large Language Model. Here it is **GPT-4o-mini**, called through **GitHub Models** (free tier). |
| **Seeding** | Loading the Excel data into the databases. You do this once, and again whenever the Excel files change. |
| **venv** | A Python virtual environment: a separate folder of Python packages for this project only. |

---

## 3. Architecture at a glance

```
┌──────────────────────────── Browser (http://localhost:5173) ───────────────────────────┐
│  React app (frontend/)                                                                 │
│   • Dashboard (KPIs, charts, table, filters)  ← reads frontend/src/data/mockData.js    │
│   • AI Chat bubble ─────────────┐                                                      │
│   • Report editor ──────────────┤                                                      │
└─────────────────────────────────┼──────────────────────────────────────────────────────┘
                                  │ HTTP (fetch → http://localhost:8000/api/...)
                                  ▼
┌──────────────────────────── FastAPI backend (http://localhost:8000) ───────────────────┐
│  app/api/router.py                                                                     │
│    POST /api/query  ──► classify question (LLM)                                        │
│                          ├─ "structured"   → nl_to_sql.py → query_executor.py → SQLite │
│                          └─ "unstructured" → rag.py → ChromaDB → LLM                   │
│    POST /api/report ──► report.py → builds .docx (python-docx + matplotlib charts)     │
│    GET  /api/health, /api/suggestions                                                  │
└────────────────────────────────────────────────────────────────────────────────────────┘
        ▲                                   ▲                              ▲
        │ seed_db.py                        │ seed_rag.py                  │ HTTPS
   data/cx.db (SQLite)              data/chroma/ (vectors)        GitHub Models (GPT-4o-mini)
        ▲                                   ▲
        └────────── backend/data/*.xlsx ────┘
```

---

## 4. Prerequisites

Install these once on your machine:

| Tool | Version | Check with | Download |
|---|---|---|---|
| **Python** | 3.10 or newer | `python --version` | https://www.python.org/downloads/ (on Windows, tick **"Add Python to PATH"**) |
| **Node.js** (includes npm) | 18 or newer | `node --version` and `npm --version` | https://nodejs.org/ |
| **Git** | any | `git --version` | https://git-scm.com/ |
| **VS Code** (optional) | any | | https://code.visualstudio.com/ |

You also need a **GitHub token** with access to GitHub Models, which the AI uses:

1. Go to https://github.com/settings/tokens.
2. Create a **fine-grained token** and give it the **Models: Read** permission. A classic token also works.
3. Copy the token (it starts with `github_pat_` or `ghp_`). You will paste it into `.env` in step 5.4.

> 🔒 **Never commit your token or share it in chat.** The `.env` file is already in `.gitignore`.

---

## 5. First-time setup (step by step)

The commands below are for **Windows PowerShell**. The macOS/Linux versions are shown in comments.

### 5.1 Get the code

```powershell
git clone <repo-url> cx-analytics
cd cx-analytics
```

### 5.2 Create the Python virtual environment (inside `backend/`)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1        # macOS/Linux: source .venv/bin/activate
```

When it works, your prompt starts with `(.venv)`.

> If PowerShell says *"running scripts is disabled on this system"*, run this once and try again:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

### 5.3 Install the Python packages

```powershell
pip install -r requirements.txt
```

This takes a few minutes because `sentence-transformers` and `torch` are large.

### 5.4 Create your `.env` file

```powershell
copy .env.example .env               # macOS/Linux: cp .env.example .env
```

Open `backend/.env` and set your token:

```env
GITHUB_TOKEN=ghp_your_real_token_here
```

Leave the other values as they are.

### 5.5 Seed the databases (load the Excel data)

Run these **from inside `backend/`** with the venv active:

```powershell
python -m scripts.seed_db      # Excel → SQLite (creates data/cx.db)
python -m scripts.seed_rag     # Excel → ChromaDB (creates data/chroma/)
```

Expected output:

```
✅ SQLite seeded — N feedback, M improvements
✅ ChromaDB seeded — X chunks indexed
```

> The first `seed_rag` run downloads the embedding model `all-MiniLM-L6-v2` (about 90 MB), so you need internet access for it.
>
> ⚠️ **You must run `seed_rag` before you start the backend.** If you don't, the backend crashes on startup because the `cx_knowledge` collection does not exist yet.

### 5.6 Install the frontend packages

Open a **second terminal**:

```powershell
cd cx-analytics\frontend
npm install
```

Setup is complete. 🎉

---

## 6. Running the project every day

You need **two terminals** running at the same time.

**Terminal 1: Backend**

```powershell
cd cx-analytics\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

Wait until you see `CX Analytics ready ✓`.

**Terminal 2: Frontend**

```powershell
cd cx-analytics\frontend
npm run dev
```

**Then open these in your browser:**

| URL | What it is |
|---|---|
| http://localhost:5173 | **The app** |
| http://localhost:8000/docs | Interactive API docs (Swagger), where you can test endpoints |
| http://localhost:8000/api/health | Health check. Should show `"db": "ok", "rag": "ok"` |

### Shortcut: run both from VS Code

The repo includes `.vscode/tasks.json`. In VS Code, press **Ctrl+Shift+B** (or open *Terminal → Run Build Task*) and choose **"Run Full Stack"**. It starts the backend and the frontend in two separate panels.

### To stop

Press **Ctrl+C** in each terminal.

---

## 7. Using the app

1. **Filters (left sidebar):** click chips to filter by quarter, source, channel, CX stage, service, or rating. The KPIs, charts, and table all update.
2. **Charts / Data tabs:** switch between the charts and the raw data table, which has *Feedback* and *Improvements* sub-tabs.
3. **Add a chart to a report:** each chart has a button that adds it to the current report or to a new one.
4. **AI chat bubble (bottom-right):** type a question or click a suggestion.
   - A **Database** answer is the NLQ path: insights, a small chart, a table, and the SQL used.
   - A **Book** answer is the RAG path: a written answer plus the source snippets.
   - Click **+ Report** on an answer to add it to a report.
5. **Report editor (top bar → Report):** manage several reports, edit the cover page (title, author, department, date), reorder or remove sections, add notes or custom text, optionally include dashboard charts, and click **Download** to get `cx-report.docx`.

---

## 8. How it works, step by step

### 8.1 What happens when you ask a question

1. **Frontend:** `AiChat.jsx` sends `POST http://localhost:8000/api/query` with `{ "question": "...", "include_insights": true }`.
2. **Backend router** (`app/api/router.py → query()`) receives the request.
3. **Classify:** `NLToSQLService.classify()` asks the LLM whether the question is **structured** (counts, averages, comparisons) or **unstructured** (themes, opinions, summaries). If the LLM call fails, it falls back to *structured*.
4. **If structured (NLQ path):**
   1. `generate_sql()` sends the database schema and the question to the LLM, which returns one SQL `SELECT`.
   2. `_validate()` **blocks anything that is not a SELECT** (INSERT, DELETE, DROP, and so on), so the AI can never change the data.
   3. `QueryExecutor.run()` runs the SQL on SQLite with a timeout (`QUERY_TIMEOUT_SECONDS`) and a row limit (`MAX_ROWS_RETURNED`).
   4. `generate_insights()` asks the LLM for 2–3 bullet-point insights based on the first rows.
   5. The response has `mode: "nlq"`, `sql`, `columns`, `rows`, and `insights`.
5. **If unstructured (RAG path):**
   1. `RAGService.answer()` turns the question into an embedding and finds the **6 most similar chunks** in ChromaDB.
   2. Those chunks are the *context*. The LLM is told to answer **only** from that context.
   3. The response has `mode: "rag"`, `answer`, and `sources` (type, quarter, channel, and a snippet for each chunk).
6. **Frontend** shows the result: `NlqAnswer` (insights, `InlineChart`, table) or `RagAnswer` (answer and sources).

### 8.2 How the data gets into the databases (seeding)

- **`scripts/seed_db.py`**
  1. Reads the `2025` sheet of both Excel files with pandas.
  2. Cleans the text (removes extra spaces and line breaks).
  3. **Normalizes names** so the same thing always has the same spelling. For example, `CC` becomes `Contact Centre`, and the CX stages are unified.
  4. Creates the lookup rows (channels, cx_stages, services) and the main rows (feedback, improvement_actions).
  5. ⚠️ It **drops and recreates all tables** each time it runs, so running it again is safe and gives a clean reload.
- **`scripts/seed_rag.py`**
  1. Reads the same Excel files.
  2. Builds one text **chunk** per row, for example `[Feedback] Q3 2025 | Channel: LIVE-CHAT | Rating: 5 … Details: …`.
  3. Embeds each chunk with `all-MiniLM-L6-v2`, which runs locally and costs nothing.
  4. Stores the chunks in the ChromaDB collection `cx_knowledge`. It deletes and recreates the collection each time it runs.

### 8.3 How the Word report is built

1. In the report editor, the frontend sends `POST /api/report` with the sections (findings, charts, custom text), the cover page, `include_charts`, and the filtered dashboard data.
2. `app/services/report.py → build_report()`:
   - adds a cover page (title, author, department, date)
   - optionally draws **dashboard charts** with matplotlib and inserts them as images
   - writes each section: AI findings (question, insights or answer, a data table), chart sections, and custom notes
3. The backend returns the `.docx` bytes, and the browser downloads `cx-report.docx`.

---

## 9. Folder and file walkthrough

```
cx-analytics/
├── README.md                     Short overview
├── PROJECT_GUIDE.md              This guide
├── .vscode/tasks.json            VS Code tasks: start backend, frontend, or both
├── backend/
│   ├── .env.example              Template for your .env (copy it, then add your token)
│   ├── requirements.txt          Python dependencies
│   ├── app/
│   │   ├── main.py               Creates the FastAPI app, CORS, and startup (creates tables)
│   │   ├── core/config.py        Reads settings from .env (pydantic-settings)
│   │   ├── db/database.py        Async SQLAlchemy engine/session and init_db()
│   │   ├── models/tables.py      ORM tables: Channel, CXStage, Service, Feedback, ImprovementAction
│   │   ├── api/
│   │   │   ├── router.py         All endpoints: /query, /health, /suggestions, /report
│   │   │   └── schemas.py        Pydantic request/response shapes
│   │   └── services/
│   │       ├── nl_to_sql.py      LLM: classify, generate SQL, validate, insights
│   │       ├── query_executor.py Runs SQL safely (timeout, row limit, JSON-safe values)
│   │       ├── rag.py            ChromaDB search + LLM answer with sources
│   │       └── report.py         Builds the Word document and matplotlib charts
│   ├── scripts/
│   │   ├── seed_db.py            Excel → SQLite
│   │   └── seed_rag.py           Excel → ChromaDB
│   └── data/
│       ├── Value_Moments.xlsx                       Source data (feedback)
│       ├── Customer_Journey-Improvement_Plan.xlsx   Source data (improvements)
│       ├── cx.db                 (generated, not in git)
│       └── chroma/               (generated, not in git)
└── frontend/
    ├── index.html, vite.config.js, package.json
    └── src/
        ├── main.jsx              React entry point
        ├── App.jsx               Main layout and all report state (multiple reports, sections)
        ├── index.css             Global styles / theme variables
        ├── hooks/useFilters.js   Filter state, filtered data, and KPI calculations
        ├── data/mockData.js      Dashboard data (FEEDBACK, IMPROVEMENTS, filter option lists)
        └── components/
            ├── layout/Topbar.jsx         Header with the report button and counter
            ├── layout/KpiRow.jsx         KPI cards
            ├── filters/FilterPanel.jsx   Left filter sidebar
            ├── charts/ChartsPanel.jsx    Dashboard charts (Recharts) + "add to report"
            ├── table/ReservationsTable.jsx  Feedback / Improvements data tables
            ├── chat/AiChat.jsx           Floating AI chat bubble
            ├── shared/InlineChart.jsx    Auto chart for NLQ results in chat
            └── report/
                ├── ReportEditorPage.jsx  Full-screen report editor and .docx download
                └── ReportPanel.jsx       Older/simple report panel
```

**Styling:** each component has its own `*.module.css` file (CSS Modules). Classes are scoped to that component, so a class name in one component cannot affect another.

---

## 10. Database schema

```
channels(id, name)              e.g. Website, Contact Centre, LIVE-CHAT, All
cx_stages(id, name)             Service Application and Submission, Communication During Procedures,
                                Receiving Service Information, Service Completion, All
services(id, name)              e.g. All Services, Bill Payment, Move In, Move Out

feedback(id, year, quarter, source, service_id → services, cx_stage_id → cx_stages,
         channel_id → channels, value_moment, details, value_moment_short, rating 1-5, created_at)

improvement_actions(id, year, quarter, source, channel_id → channels, service_id → services,
                    cx_stage_id → cx_stages, problem, action, created_at)
```

To look at the data yourself, open `backend/data/cx.db` with [DB Browser for SQLite](https://sqlitebrowser.org/) or the VS Code *SQLite Viewer* extension.

---

## 11. API reference

| Method | Endpoint | Body | Returns |
|---|---|---|---|
| `POST` | `/api/query` | `{ "question": str (3–1000 chars), "include_insights": bool }` | NLQ: `mode, sql, columns, rows, row_count, truncated, insights` · RAG: `mode, answer, sources` |
| `POST` | `/api/report` | `{ sections[], cover{title,author,department,date}, include_charts, chart_data{feedback[],improvements[]} }` | `.docx` file |
| `GET` | `/api/health` | | `{ status, db, model, rag }` |
| `GET` | `/api/suggestions` | | `{ suggestions: [...] }` |

Quick test from PowerShell:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8000/api/query -ContentType "application/json" -Body '{"question":"Which channel has the most improvement actions?","include_insights":true}'
```

The easiest way to test is http://localhost:8000/docs. Click an endpoint, then **Try it out**, then **Execute**.

---

## 12. Configuration (.env)

The settings live in `backend/.env` and are read by `backend/app/core/config.py`.

| Variable | Default | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | *(required)* | Token for GitHub Models (the LLM) |
| `GITHUB_MODEL` | `gpt-4o-mini` | Which model to use |
| `DATABASE_URL` | `sqlite+aiosqlite:///./data/cx.db` | SQLite file path (relative to `backend/`) |
| `CHROMA_PATH` | `./data/chroma` | ChromaDB folder (relative to `backend/`) |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Which frontend URLs may call the API |
| `MAX_ROWS_RETURNED` | `500` | Maximum rows returned by an NLQ query |
| `QUERY_TIMEOUT_SECONDS` | `30` | SQL timeout |

> The paths are **relative**, so always start the backend and run the seed scripts **from inside `backend/`**.

---

## 13. Common tasks (how do I…?)

**Update the data after the Excel files change**
1. Replace the files in `backend/data/`. Keep the same file names, the same sheet name (`2025`), and the same column headers.
2. Stop the backend, then run `python -m scripts.seed_db` and `python -m scripts.seed_rag`.
3. Start the backend again.
4. ⚠️ The **dashboard** charts and KPIs use `frontend/src/data/mockData.js`, so update that file too (see section 15).

**Change the AI model**
Set `GITHUB_MODEL=` in `.env`, for example to another model listed on GitHub Models, then restart the backend.

**Add or change suggested questions**
- In the chat UI: edit `SUGGESTIONS` in `frontend/src/components/chat/AiChat.jsx`.
- In the API: edit `SUGGESTIONS` in `backend/app/api/router.py`.

**Improve SQL accuracy**
Edit the `SCHEMA` prompt in `backend/app/services/nl_to_sql.py`. Add example values or rules that the LLM keeps getting wrong.

**Add a new API endpoint**
1. Add the request and response models in `app/api/schemas.py`.
2. Add the function with `@router.get/post(...)` in `app/api/router.py`.
3. Put the business logic in a new file under `app/services/`.

**Add a new dashboard chart**
Add it in `frontend/src/components/charts/ChartsPanel.jsx`, using `filteredFeedback` and `filteredImprovements` (already filtered by the sidebar).

**Build the frontend for production**
`cd frontend` then `npm run build`. The output goes to `frontend/dist/`.

---

## 14. Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `python` is not recognized | Python is not on PATH | Reinstall Python with "Add to PATH" ticked, or use `py` instead of `python` |
| `Activate.ps1 cannot be loaded… scripts disabled` | PowerShell policy | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `ModuleNotFoundError: No module named 'app'` | Command run from the wrong folder | `cd backend` first, and use `python -m scripts.seed_db` (with `-m`) |
| `ModuleNotFoundError` for fastapi, chromadb, and so on | venv not active | Activate it: `.\.venv\Scripts\Activate.ps1` |
| Backend crashes with `Collection cx_knowledge does not exist` | RAG not seeded | `python -m scripts.seed_rag` |
| `FileNotFoundError: data/Value_Moments.xlsx` | Seed run outside `backend/` | `cd backend` and run it again |
| Chat shows **"API error"** or `401 Unauthorized` / `Failed to generate SQL` | Missing, invalid, or expired `GITHUB_TOKEN` | Check `backend/.env` and create a new token with Models access |
| `429 Too Many Requests` | Free-tier rate limit on GitHub Models | Wait a minute and try again |
| Chat shows "Failed to fetch" | Backend not running | Start the backend on port **8000** |
| CORS error in the browser console | Frontend URL not allowed | Add the URL to `CORS_ORIGINS` in `.env` and restart the backend |
| Port 8000 or 5173 already in use | Another process is using it | Close the other process, or run on another port (but see the hardcoded URLs in section 15) |
| `/api/health` shows `"rag": "not seeded"` | ChromaDB is empty or missing | `python -m scripts.seed_rag` |
| First `seed_rag` run is slow or fails | Model download (~90 MB) | Check your internet connection or proxy and try again |

---

## 15. Known limitations and gotchas

Read these so you don't lose time on them:

1. **The dashboard does not read from the backend.** The KPIs, charts, filters, and data table use hardcoded data in `frontend/src/data/mockData.js`. Only the **AI chat** and the **report download** call the backend. If the Excel data changes, `mockData.js` needs a manual update. A good future improvement is a `/api/data` endpoint so the dashboard reads from SQLite.
2. **The backend URL is hardcoded** as `http://localhost:8000` in `AiChat.jsx`, `ReportEditorPage.jsx`, and `ReportPanel.jsx`. `vite.config.js` already has a `/api` proxy, so these could become relative URLs (`/api/query`) before deployment.
3. **The seed scripts wipe and rebuild** the database and the vector store each time they run. This is fine because the Excel files are the source of truth.
4. **Only the `2025` sheet** of each Excel file is loaded.
5. **The AI can be wrong.** For NLQ answers, always look at the generated SQL shown in the chat. RAG answers are limited to the 6 most relevant chunks.
6. **Every question uses 2–3 LLM calls** (classify, generate SQL, insights), so the free-tier rate limits are reached faster than you might expect.
7. `config.py` has an unused `google_api_key` setting, kept for a possible future Google AI integration. The app currently uses **GitHub Models only**.
8. Generated files are **not committed** (`cx.db`, `chroma/`, `.env`, `.venv/`, `node_modules/`). Every developer creates them locally with the steps in section 5.

---

**Questions?** Ask the project owner. To improve this guide, edit `PROJECT_GUIDE.md` and open a PR.
