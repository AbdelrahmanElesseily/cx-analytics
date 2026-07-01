from __future__ import annotations
import logging
import chromadb
from chromadb.utils import embedding_functions
from openai import AsyncOpenAI
from app.core.config import get_settings

logger   = logging.getLogger(__name__)
settings = get_settings()

RAG_PROMPT = """
You are a CX analytics expert. Use ONLY the context below to answer the question.
Be specific, reference exact details from the context.
If the context doesn't contain enough information, say so clearly.

Context:
{context}

Question: {question}

Answer in 3-5 sentences with specific details from the context.
""".strip()


class RAGService:
    def __init__(self):
        self._ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        self._client_chroma = chromadb.PersistentClient(path=settings.chroma_path)
        self._collection = self._client_chroma.get_collection(
            name="cx_knowledge",
            embedding_function=self._ef,
        )
        self._llm = AsyncOpenAI(
            base_url=settings.github_base_url,
            api_key=settings.github_token,
        )

    async def answer(self, question: str, n_results: int = 6) -> dict:
        """Retrieve relevant chunks and generate an answer."""
        # Retrieve
        results = self._collection.query(
            query_texts=[question],
            n_results=n_results,
        )
        docs  = results["documents"][0]
        metas = results["metadatas"][0]

        if not docs:
            return {"answer": "No relevant information found in the knowledge base.", "sources": []}

        context = "\n\n---\n\n".join(docs)

        # Generate
        resp = await self._llm.chat.completions.create(
            model=settings.github_model,
            temperature=0.3,
            messages=[
                {"role": "user", "content": RAG_PROMPT.format(
                    context=context, question=question
                )}
            ],
        )
        answer = resp.choices[0].message.content.strip()

        # Build source list for transparency
        sources = []
        for doc, meta in zip(docs, metas):
            sources.append({
                "type":     meta.get("type"),
                "quarter":  meta.get("quarter"),
                "channel":  meta.get("channel"),
                "cx_stage": meta.get("cx_stage"),
                "snippet":  doc[:120] + "..." if len(doc) > 120 else doc,
            })

        return {"answer": answer, "sources": sources}
