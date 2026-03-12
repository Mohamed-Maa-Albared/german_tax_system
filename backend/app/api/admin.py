"""Admin panel routes — all protected by JWT."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.config import settings
from app.database import get_db
from app.models.tax_parameter import AdminCredential
from app.schemas.admin import (
    AdminLoginRequest,
    AdminTokenResponse,
    TaxParametersAdminSchema,
    TaxParametersCreateSchema,
    TaxParametersUpdateSchema,
)
from app.schemas.tax import TaxParametersPublicSchema
from app.services import parameter_service
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

router = APIRouter(prefix="/admin", tags=["admin"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()

ALGORITHM = "HS256"


def _create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(
        minutes=settings.admin_token_expire_minutes
    )
    return jwt.encode(payload, settings.admin_secret_key, algorithm=ALGORITHM)


def _verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.admin_secret_key, algorithms=[ALGORITHM])
        sub: str = payload.get("sub")
        if sub != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized"
            )
        return sub
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/login", response_model=AdminTokenResponse)
def admin_login(request: AdminLoginRequest, db: Session = Depends(get_db)):
    """Authenticate admin and return a short-lived JWT."""
    credential = db.query(AdminCredential).first()
    if not credential or not pwd_context.verify(
        request.password, credential.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
        )
    token = _create_token({"sub": "admin"})
    return AdminTokenResponse(access_token=token)


@router.get("/parameters", response_model=list[TaxParametersPublicSchema])
def list_all_parameters(
    db: Session = Depends(get_db),
    _: str = Depends(_verify_token),
):
    return parameter_service.get_all_parameters(db)


@router.post("/parameters", response_model=TaxParametersPublicSchema, status_code=201)
def create_parameters(
    payload: TaxParametersCreateSchema,
    db: Session = Depends(get_db),
    _: str = Depends(_verify_token),
):
    existing = parameter_service.get_parameters_by_year(db, payload.year)
    if existing:
        raise HTTPException(
            status_code=409, detail=f"Parameters for year {payload.year} already exist."
        )
    return parameter_service.create_parameters(db, payload.model_dump())


@router.put("/parameters/{year}", response_model=TaxParametersPublicSchema)
def update_parameters(
    year: int,
    payload: TaxParametersUpdateSchema,
    db: Session = Depends(get_db),
    _: str = Depends(_verify_token),
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updated = parameter_service.update_parameters(db, year, updates)
    if not updated:
        raise HTTPException(status_code=404, detail=f"No parameters for year {year}.")
    return updated


@router.post("/parameters/{year}/activate", response_model=TaxParametersPublicSchema)
def activate_year(
    year: int,
    db: Session = Depends(get_db),
    _: str = Depends(_verify_token),
):
    activated = parameter_service.activate_year(db, year)
    if not activated:
        raise HTTPException(status_code=404, detail=f"No parameters for year {year}.")
    return activated


@router.post(
    "/parameters/{year}/copy-to/{new_year}",
    response_model=TaxParametersPublicSchema,
    status_code=201,
)
def copy_year_to_new(
    year: int,
    new_year: int,
    db: Session = Depends(get_db),
    _: str = Depends(_verify_token),
):
    """Copy an existing year's parameters as a starting point for a new year."""
    source = parameter_service.get_parameters_by_year(db, year)
    if not source:
        raise HTTPException(status_code=404, detail=f"Source year {year} not found.")
    if parameter_service.get_parameters_by_year(db, new_year):
        raise HTTPException(status_code=409, detail=f"Year {new_year} already exists.")

    data = {
        col.name: getattr(source, col.name)
        for col in source.__table__.columns
        if col.name
        not in ("id", "year", "is_active", "created_at", "updated_at", "notes")
    }
    data["year"] = new_year
    data["is_active"] = False
    data["notes"] = f"Copied from {year} — update before activating."
    return parameter_service.create_parameters(db, data)
