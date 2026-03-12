from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.tax_parameter import AdminCredential
from app.schemas.admin import AdminLoginRequest, AdminTokenResponse, TaxParametersUpdateSchema
from app.schemas.tax import TaxParametersPublicSchema
from app.services import parameter_service
from app.services.admin_service import _create_token, _verify_token, pwd_context

router = APIRouter()


@router.post("/login", response_model=AdminTokenResponse)
def admin_login(request: AdminLoginRequest, db: Session = Depends(get_db)):
    credential = db.query(AdminCredential).first()
    if not credential or not pwd_context.verify(request.password, credential.password_hash):
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
    return parameter_service.list_all_parameters(db)


@router.put("/parameters/{year}", response_model=TaxParametersPublicSchema)
def update_parameters(
    year: int,
    updates: TaxParametersUpdateSchema,
    db: Session = Depends(get_db),
    _: str = Depends(_verify_token),
):
    result = parameter_service.update_parameters(
        db, year, updates.model_dump(exclude_none=True)
    )
    if not result:
        raise HTTPException(status_code=404, detail=f"Parameters for year {year} not found.")
    return result


@router.post("/parameters/{year}/activate", response_model=TaxParametersPublicSchema)
def activate_year(
    year: int,
    db: Session = Depends(get_db),
    _: str = Depends(_verify_token),
):
    result = parameter_service.activate_year(db, year)
    if not result:
        raise HTTPException(status_code=404, detail=f"Parameters for year {year} not found.")
    return result


@router.post("/parameters/{year}/copy-to/{target_year}", response_model=TaxParametersPublicSchema,
             status_code=201)
def copy_year(
    year: int,
    target_year: int,
    db: Session = Depends(get_db),
    _: str = Depends(_verify_token),
):
    result = parameter_service.copy_year(db, year, target_year)
    if not result:
        raise HTTPException(
            status_code=400,
            detail=f"Could not copy year {year} to {target_year} (source missing or target exists).",
        )
    return result
