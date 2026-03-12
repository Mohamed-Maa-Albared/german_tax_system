"""SmartTax Germany — FastAPI Application Entry Point"""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.api.router import api_router

logging.basicConfig(level=logging.DEBUG if settings.debug else logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SmartTax Germany API",
    description="German income tax calculation engine — 2026 edition",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,   # Hide docs in production
    redoc_url="/redoc" if settings.debug else None,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(api_router, prefix="/api")


@app.on_event("startup")
def on_startup():
    logger.info("Initialising database tables…")
    init_db()
    logger.info("SmartTax Germany API started. Environment: %s", "debug" if settings.debug else "production")


@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.app_name}
