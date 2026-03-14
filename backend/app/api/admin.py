from __future__ import annotations

from typing import Optional

from app.database import get_db, settings
from app.models.tax_parameter import AdminAuditLog, AdminCredential, TaxYearParameter
from app.schemas.admin import (
    AdminLoginRequest,
    AdminSettingsUpdateRequest,
    AdminTokenResponse,
    PasswordChangeRequest,
    TaxParametersUpdateSchema,
)
from app.schemas.tax import TaxParametersPublicSchema
from app.services import parameter_service
from app.services.admin_service import _create_token, _verify_token, pwd_context
from app.services.ollama_service import ollama_service
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()


@router.post("/login", response_model=AdminTokenResponse)
def admin_login(request: AdminLoginRequest, db: Session = Depends(get_db)):
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


@router.get("/health")
async def admin_health(
    db: Session = Depends(get_db),
    _: str = Depends(_verify_token),
):
    """System health check — DB, Ollama, active year."""
    # DB check
    db_ok = False
    active_year: Optional[int] = None
    year_count = 0
    try:
        active_param = (
            db.query(TaxYearParameter)
            .filter(TaxYearParameter.is_active.is_(True))
            .first()
        )
        year_count = db.query(TaxYearParameter).count()
        active_year = active_param.year if active_param else None
        db_ok = True
    except Exception:
        pass

    # Ollama check (async)
    ollama_ok = await ollama_service.is_ollama_available()

    return {
        "database": {
            "status": "ok" if db_ok else "error",
            "active_year": active_year,
            "year_count": year_count,
        },
        "ollama": {
            "status": "ok" if ollama_ok else "unavailable",
            "model": settings.ollama_model,
            "enabled": settings.ollama_enabled,
            "base_url": settings.ollama_base_url,
        },
    }


@router.get("/settings")
def admin_get_settings(_: str = Depends(_verify_token)):
    """Return current AI/Ollama runtime settings."""
    return {
        "ollama_model": settings.ollama_model,
        "ollama_enabled": settings.ollama_enabled,
        "ollama_base_url": settings.ollama_base_url,
        "ollama_timeout": settings.ollama_timeout,
    }


@router.put("/settings")
def admin_update_settings(
    req: AdminSettingsUpdateRequest,
    db: Session = Depends(get_db),
    _: str = Depends(_verify_token),
):
    """Update Ollama runtime settings. Persists OLLAMA_MODEL to backend/.env."""
    # Validate model name to prevent injection (alphanumeric, colon, dash, dot only)
    import os
    import pathlib
    import re

    if req.ollama_model is not None:
        if not re.match(r"^[a-zA-Z0-9_:.\-]+$", req.ollama_model):
            raise HTTPException(status_code=400, detail="Invalid model name format.")
        old_model = settings.ollama_model
        settings.ollama_model = req.ollama_model
        # Persist to .env file
        env_path = pathlib.Path(__file__).parent.parent.parent / ".env"
        if env_path.is_file():
            text = env_path.read_text(encoding="utf-8")
            new_text = re.sub(
                r"^OLLAMA_MODEL=.*$",
                f"OLLAMA_MODEL={req.ollama_model}",
                text,
                flags=re.MULTILINE,
            )
            env_path.write_text(new_text, encoding="utf-8")
        # Audit log
        if old_model != req.ollama_model:
            db.add(
                AdminAuditLog(
                    action="change_model",
                    target="OLLAMA_MODEL",
                    old_value=old_model,
                    new_value=req.ollama_model,
                )
            )
            db.commit()
    if req.ollama_enabled is not None:
        settings.ollama_enabled = req.ollama_enabled
    if req.ollama_timeout is not None:
        settings.ollama_timeout = req.ollama_timeout
    return {
        "ollama_model": settings.ollama_model,
        "ollama_enabled": settings.ollama_enabled,
        "ollama_base_url": settings.ollama_base_url,
        "ollama_timeout": settings.ollama_timeout,
    }


@router.put("/password")
def admin_change_password(
    req: PasswordChangeRequest,
    db: Session = Depends(get_db),
    _: str = Depends(_verify_token),
):
    """Change the admin password. Requires the current password for verification."""
    credential = db.query(AdminCredential).first()
    if not credential or not pwd_context.verify(
        req.current_password, credential.password_hash
    ):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")
    credential.password_hash = pwd_context.hash(req.new_password)
    db.add(AdminAuditLog(action="change_password", target="admin"))
    db.commit()
    return {"message": "Password updated successfully."}


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
    changes = updates.model_dump(exclude_none=True)
    if changes:
        # Fetch current values for audit log before applying changes
        param = db.query(TaxYearParameter).filter(TaxYearParameter.year == year).first()
        if param:
            for field_name, new_val in changes.items():
                old_val = getattr(param, field_name, None)
                if old_val != new_val:
                    db.add(
                        AdminAuditLog(
                            action="update_parameter",
                            target=f"year={year}.{field_name}",
                            old_value=str(old_val),
                            new_value=str(new_val),
                        )
                    )
    result = parameter_service.update_parameters(db, year, changes)
    if not result:
        raise HTTPException(
            status_code=404, detail=f"Parameters for year {year} not found."
        )
    db.commit()
    return result


@router.post("/parameters/{year}/activate", response_model=TaxParametersPublicSchema)
def activate_year(
    year: int,
    db: Session = Depends(get_db),
    _: str = Depends(_verify_token),
):
    result = parameter_service.activate_year(db, year)
    if not result:
        raise HTTPException(
            status_code=404, detail=f"Parameters for year {year} not found."
        )
    db.add(AdminAuditLog(action="activate_year", target=str(year)))
    db.commit()
    return result


@router.post(
    "/parameters/{year}/copy-to/{target_year}",
    response_model=TaxParametersPublicSchema,
    status_code=201,
)
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


@router.delete("/parameters/{year}", status_code=204)
def delete_year(
    year: int,
    db: Session = Depends(get_db),
    _: str = Depends(_verify_token),
):
    """Delete a tax year. The active year cannot be deleted."""
    param = db.query(TaxYearParameter).filter(TaxYearParameter.year == year).first()
    if not param:
        raise HTTPException(status_code=404, detail=f"Year {year} not found.")
    if param.is_active:
        raise HTTPException(status_code=400, detail="Cannot delete the active year.")
    db.delete(param)
    db.commit()
    db.add(AdminAuditLog(action="delete_year", target=str(year)))
    db.commit()


@router.get("/audit-log")
def get_audit_log(
    limit: int = 50,
    db: Session = Depends(get_db),
    _: str = Depends(_verify_token),
):
    """Return the most recent audit log entries (newest first)."""
    entries = (
        db.query(AdminAuditLog)
        .order_by(AdminAuditLog.timestamp.desc())
        .limit(min(limit, 200))
        .all()
    )
    return [
        {
            "id": e.id,
            "timestamp": e.timestamp.isoformat(),
            "action": e.action,
            "target": e.target,
            "old_value": e.old_value,
            "new_value": e.new_value,
        }
        for e in entries
    ]
