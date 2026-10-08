import traceback
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.agents.agent import run_agent

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    repo_id: str

@router.post("/")
def chat_with_repo(request: ChatRequest):
    try:
        response = run_agent(request.query, request.repo_id)
        return {"response": response}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
