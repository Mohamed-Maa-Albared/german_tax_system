from fastapi import APIRouter
from app.api import tax, admin, ai

api_router = APIRouter()
api_router.include_router(tax.router)
api_router.include_router(admin.router)
api_router.include_router(ai.router)
