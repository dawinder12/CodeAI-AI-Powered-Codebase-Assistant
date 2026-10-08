from fastapi import APIRouter
from app.api.endpoints import repositories, chat, system

router = APIRouter()
router.include_router(system.router, tags=["system"])
router.include_router(repositories.router, prefix="/repositories", tags=["repositories"])
router.include_router(chat.router, prefix="/chat", tags=["chat"])
