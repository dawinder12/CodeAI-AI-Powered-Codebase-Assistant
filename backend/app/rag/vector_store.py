import os
from typing import List, Dict, Any
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document
from app.config import settings

class VectorStore:
    def __init__(self):
        self.store_path = settings.VECTOR_DB_PATH
        self.vector_store = None
        self._embeddings = None

    @property
    def embeddings(self):
        if self._embeddings is None:
            # Using local sentence-transformers model: fast, robust, and zero quota limits
            self._embeddings = HuggingFaceEmbeddings(
                model_name="all-MiniLM-L6-v2"
            )
        return self._embeddings

    def _load_store(self):
        if os.path.exists(os.path.join(self.store_path, "index.faiss")):
            try:
                self.vector_store = FAISS.load_local(
                    self.store_path, 
                    self.embeddings,
                    allow_dangerous_deserialization=True
                )
            except Exception as e:
                print(f"Warning: could not load existing vector store: {e}")
                self.vector_store = None
        else:
            self.vector_store = None

    def add_documents(self, documents: List[Dict[str, Any]], repo_id: str):
        if not documents:
            return
        docs = [
            Document(page_content=d["text"], metadata=d["metadata"]) 
            for d in documents
        ]
        if not self.vector_store:
            self.vector_store = FAISS.from_documents(docs, self.embeddings)
        else:
            self.vector_store.add_documents(docs)
        
        os.makedirs(self.store_path, exist_ok=True)
        self.vector_store.save_local(self.store_path)

    def search(self, query: str, repo_id: str, top_k: int = 5) -> List[Dict[str, Any]]:
        if not self.vector_store:
            self._load_store()
            if not self.vector_store:
                return []
        
        try:
            results = self.vector_store.similarity_search_with_score(
                query, 
                k=top_k, 
                filter=lambda metadata: metadata.get("repo_id") == repo_id
            )
        except Exception:
            # Fallback without filter if callable filter is unsupported
            raw_results = self.vector_store.similarity_search_with_score(query, k=top_k * 2)
            results = [
                (doc, score) for doc, score in raw_results 
                if doc.metadata.get("repo_id") == repo_id
            ][:top_k]
        
        formatted_results = []
        for doc, score in results:
            formatted_results.append({
                "text": doc.page_content,
                "metadata": doc.metadata,
                "score": float(score)
            })
        return formatted_results

    def delete_repository(self, repo_id: str):
        pass

    def clear(self):
        self.vector_store = None
        import shutil
        if os.path.exists(self.store_path):
            shutil.rmtree(self.store_path)

vector_store = VectorStore()
