"""ChromaDB vector store for business context matching."""
from __future__ import annotations
import chromadb
from chromadb.config import Settings

# Initialize ChromaDB with persistent storage
_client = chromadb.PersistentClient(path="./data/chromadb")
_collection = _client.get_or_create_collection(
    name="business_contexts",
    metadata={"hnsw:space": "cosine"},
)


def add_business_context(context_id: str, user_id: str, text: str):
    """Add a business context document to the vector store."""
    _collection.upsert(
        documents=[text],
        ids=[context_id],
        metadatas=[{"user_id": user_id}],
    )


def update_business_context(context_id: str, text: str):
    """Update a business context document in the vector store."""
    _collection.update(
        documents=[text],
        ids=[context_id],
    )


def delete_business_context(context_id: str):
    """Delete a business context from the vector store."""
    try:
        _collection.delete(ids=[context_id])
    except Exception:
        pass  # Already deleted or doesn't exist


def search_matching_contexts(capability_text: str, threshold: float = 0.3, top_k: int = 5) -> list[dict]:
    """Search for business contexts that match an AI capability."""
    results = _collection.query(
        query_texts=[capability_text],
        n_results=top_k,
    )

    matches = []
    if results and results["documents"]:
        for i, doc in enumerate(results["documents"][0]):
            distance = results["distances"][0][i] if results["distances"] else 1.0
            similarity = 1 - distance  # cosine distance to similarity
            if similarity >= threshold:
                matches.append({
                    "context_id": results["ids"][0][i],
                    "user_id": results["metadatas"][0][i]["user_id"],
                    "document": doc,
                    "similarity": similarity,
                })
    return matches
