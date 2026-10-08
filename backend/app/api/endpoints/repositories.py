from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict
from app.services.github_service import github_service
from app.rag.chunking import chunker
from app.rag.vector_store import vector_store

router = APIRouter()

class RepoRequest(BaseModel):
    url: str
    github_token: str | None = None

# Simple in-memory storage for repository statuses
repo_db: Dict[str, dict] = {}

async def process_repository(repo_id: str, owner: str, repo: str, github_token: str = None):
    try:
        repo_db[repo_id]["status"] = "fetching_files"
        files = await github_service.get_repository_tree(owner, repo, token=github_token)
        
        repo_db[repo_id]["status"] = "processing_code"
        all_chunks = []
        for file in files:
            content = await github_service.get_file_content(file["url"], token=github_token)
            if content:
                chunks = chunker.chunk_file(content, file["path"], repo_id)
                all_chunks.extend(chunks)
                
        repo_db[repo_id]["status"] = "generating_embeddings"
        vector_store.add_documents(all_chunks, repo_id)
        
        repo_db[repo_id]["status"] = "ready"
        repo_db[repo_id]["files"] = [f["path"] for f in files]
        
    except Exception as e:
        repo_db[repo_id]["status"] = "error"
        repo_db[repo_id]["error"] = str(e)

@router.post("/analyze")
async def analyze_repository(request: RepoRequest, background_tasks: BackgroundTasks):
    try:
        owner, repo = github_service.extract_owner_repo(request.url)
        repo_id = f"{owner}-{repo}"
        
        if repo_id not in repo_db:
            repo_db[repo_id] = {
                "id": repo_id,
                "url": request.url,
                "status": "connecting",
                "files": []
            }
            background_tasks.add_task(process_repository, repo_id, owner, repo, request.github_token)
            
        return {"repo_id": repo_id, "status": repo_db[repo_id]["status"]}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{repo_id}")
def get_repository(repo_id: str):
    if repo_id not in repo_db:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo_db[repo_id]

@router.get("/{repo_id}/files")
def get_repository_files(repo_id: str):
    if repo_id not in repo_db:
        raise HTTPException(status_code=404, detail="Repository not found")
    return {"files": repo_db[repo_id].get("files", [])}
