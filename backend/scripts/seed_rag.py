#!/usr/bin/env python
"""
Build the ChromaDB vector store from Excel data.
Run from backend/: python -m scripts.seed_rag
"""
import re
import pandas as pd
import chromadb
from chromadb.utils import embedding_functions
from app.core.config import get_settings

settings = get_settings()
VM_FILE  = "data/Value_Moments.xlsx"
CJ_FILE  = "data/Customer_Journey-Improvement_Plan.xlsx"


def clean(val):
    if pd.isna(val) or val is None:
        return ""
    return re.sub(r'\s+', ' ', str(val).replace('\n', ' ')).strip()


def norm_channel(raw):
    if not raw:
        return 'All'
    m = {
        'cc': 'Contact Centre', 'branchchc': 'Branch CHC',
        'whatsapp and web chat': 'WhatsApp & Web Chat',
        'website/smart app': 'Website / Smart App',
    }
    return m.get(raw.strip().lower(), raw.strip())


def norm_stage(raw):
    if not raw:
        return 'All'
    s = raw.split('\n')[0].strip()
    m = {
        'service application submission':     'Service Application and Submission',
        'service application and submission': 'Service Application and Submission',
        'communication during procedures':    'Communication During Procedures',
        'receiving service information':      'Receiving Service Information',
        'service completion':                 'Service Completion',
    }
    return m.get(s.lower(), s)


def build_chunks():
    chunks, metas, ids = [], [], []

    # ── Value Moments ─────────────────────────────────────────────────────
    vm = pd.read_excel(VM_FILE, sheet_name='2025')
    for i, r in vm.iterrows():
        channel  = clean(r.get('Service')) or 'All'
        cx_stage = norm_stage(clean(r.get('CX Stages')))
        short    = clean(r.get('Value Moment (Short)'))
        details  = clean(r.get('Details'))
        source   = clean(r.get('Source'))
        quarter  = clean(r.get('Quarter'))
        rating   = int(r.get('HM Rating', 3)) if not pd.isna(r.get('HM Rating', None)) else 3

        text = (
            f"[Feedback] {quarter} 2025 | Source: {source} | Channel: {channel} | "
            f"CX Stage: {cx_stage} | Rating: {rating}/5\n"
            f"Value Moment: {short}\n"
            f"Details: {details}"
        )
        chunks.append(text)
        metas.append({
            "type":     "feedback",
            "quarter":  quarter,
            "source":   source,
            "channel":  channel,
            "cx_stage": cx_stage,
            "rating":   rating,
        })
        ids.append(f"fb_{i}")

    # ── Improvement Actions ───────────────────────────────────────────────
    cj = pd.read_excel(CJ_FILE, sheet_name='2025')
    for i, r in cj.iterrows():
        quarter  = clean(r.get('Quarter'))
        source   = re.sub(r'\s+', ' ', clean(r.get('Source')).replace('\n', ' & ')).strip()
        channel  = norm_channel(clean(r.get('Channel')))
        service  = clean(r.get('Services')) or 'All Services'
        cx_stage = norm_stage(clean(r.get('Customer Journey Stages')))
        problem  = clean(r.get('Areas of Improvement'))
        action   = clean(r.get('Improvements Actions'))

        text = (
            f"[Improvement] {quarter} 2025 | Source: {source} | Channel: {channel} | "
            f"Service: {service} | CX Stage: {cx_stage}\n"
            f"Problem: {problem}\n"
            f"Action: {action}"
        )
        chunks.append(text)
        metas.append({
            "type":     "improvement",
            "quarter":  quarter,
            "source":   source,
            "channel":  channel,
            "service":  service,
            "cx_stage": cx_stage,
        })
        ids.append(f"im_{i}")

    return chunks, metas, ids


def seed():
    print("Loading sentence-transformers embedding model...")
    ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )

    client = chromadb.PersistentClient(path=settings.chroma_path)

    # Drop and recreate collection
    try:
        client.delete_collection("cx_knowledge")
    except Exception:
        pass

    collection = client.create_collection(
        name="cx_knowledge",
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"},
    )

    chunks, metas, ids = build_chunks()

    # Insert in batches of 50
    batch = 50
    for i in range(0, len(chunks), batch):
        collection.add(
            documents=ids[i:i+batch],
            metadatas=metas[i:i+batch],
            ids=ids[i:i+batch],
        )
        # Re-add with actual text
        collection.update(
            ids=ids[i:i+batch],
            documents=chunks[i:i+batch],
        )

    print(f"✅ ChromaDB seeded — {len(chunks)} chunks indexed")
    print(f"   Feedback chunks:    {sum(1 for m in metas if m['type']=='feedback')}")
    print(f"   Improvement chunks: {sum(1 for m in metas if m['type']=='improvement')}")


if __name__ == "__main__":
    seed()
