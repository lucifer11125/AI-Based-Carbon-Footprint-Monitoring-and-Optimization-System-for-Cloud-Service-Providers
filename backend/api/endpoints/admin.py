from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from core.database import get_db
from core.auth import get_current_user, require_role
from models.sql_models import (
    User, Company, Dataset, ProcessedMetric, UsageRecord
)
from schemas.schemas import UserResponse, UserUpdate, AdminOverview

router = APIRouter()


@router.get("/overview")
def get_admin_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("csp_admin")),
):
    """Get global platform overview for admin dashboard."""
    total_companies = db.query(Company).count()
    total_users = db.query(User).count()
    total_datasets = db.query(Dataset).count()

    metric_totals = db.query(
        func.coalesce(func.sum(ProcessedMetric.total_carbon), 0),
        func.coalesce(func.sum(ProcessedMetric.total_energy), 0),
        func.coalesce(func.avg(ProcessedMetric.sustainability_score), 0),
    ).one()
    total_cost = db.query(func.coalesce(func.sum(UsageRecord.monthly_cost), 0)).scalar() or 0

    total_carbon = metric_totals[0] or 0
    total_energy = metric_totals[1] or 0
    avg_sustainability = metric_totals[2] or 0

    dataset_counts = dict(
        db.query(Dataset.company_id, func.count(Dataset.id))
        .group_by(Dataset.company_id)
        .all()
    )
    user_counts = dict(
        db.query(User.company_id, func.count(User.id))
        .filter(User.company_id.isnot(None))
        .group_by(User.company_id)
        .all()
    )
    metric_by_company = {
        row.company_id: row
        for row in (
            db.query(
                Dataset.company_id.label("company_id"),
                func.coalesce(func.sum(ProcessedMetric.total_carbon), 0).label("carbon"),
                func.coalesce(func.sum(ProcessedMetric.total_energy), 0).label("energy"),
                func.coalesce(func.avg(ProcessedMetric.sustainability_score), 0).label("sustainability"),
            )
            .join(ProcessedMetric, ProcessedMetric.dataset_id == Dataset.id)
            .group_by(Dataset.company_id)
            .all()
        )
    }
    cost_by_company = dict(
        db.query(
            Dataset.company_id,
            func.coalesce(func.sum(UsageRecord.monthly_cost), 0),
        )
        .join(UsageRecord, UsageRecord.dataset_id == Dataset.id)
        .group_by(Dataset.company_id)
        .all()
    )

    companies = db.query(Company).all()
    rankings = []
    for c in companies:
        metric_row = metric_by_company.get(c.id)
        company_carbon = metric_row.carbon if metric_row else 0.0
        company_energy = metric_row.energy if metric_row else 0.0
        company_sustainability = metric_row.sustainability if metric_row else 0.0

        rankings.append({
            "id": c.id,
            "name": c.name,
            "industry": c.industry,
            "region": c.region,
            "dataset_count": dataset_counts.get(c.id, 0),
            "user_count": user_counts.get(c.id, 0),
            "total_carbon": round(company_carbon, 2),
            "total_energy": round(company_energy, 2),
            "total_cost": round(cost_by_company.get(c.id, 0.0), 2),
            "sustainability_score": round(company_sustainability, 1),
        })

    rankings.sort(key=lambda x: x["total_carbon"], reverse=True)

    return {
        "total_companies": total_companies,
        "total_users": total_users,
        "total_datasets": total_datasets,
        "total_carbon": round(total_carbon, 2),
        "total_energy": round(total_energy, 2),
        "total_cost": round(total_cost, 2),
        "avg_sustainability": round(avg_sustainability, 1),
        "company_rankings": rankings,
    }


@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("csp_admin")),
):
    """List all users (admin only)."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        company_name = None
        if u.company_id:
            company = db.query(Company).filter(Company.id == u.company_id).first()
            company_name = company.name if company else None
        result.append(UserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            company_id=u.company_id,
            company_name=company_name,
            is_active=u.is_active,
            must_reset_password=u.must_reset_password,
            created_by=u.created_by,
            created_at=u.created_at,
        ))
    return result


from schemas.schemas import UserRegister
from core.auth import hash_password

@router.post("/users", response_model=UserResponse)
def create_user(
    data: UserRegister,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("csp_admin")),
):
    """Create a user (admin only)."""
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    valid_roles = ["csp_admin", "csp_analyst", "company_user"]
    if data.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")

    company_id = None
    if data.role == "company_user":
        if data.company_name:
            company = db.query(Company).filter(Company.name == data.company_name).first()
            if not company:
                company = Company(name=data.company_name)
                db.add(company)
                db.commit()
                db.refresh(company)
            company_id = company.id
        elif data.company_id:
            company = db.query(Company).filter(Company.id == data.company_id).first()
            if not company:
                raise HTTPException(status_code=404, detail="Company not found")
            company_id = company.id
        else:
            raise HTTPException(status_code=400, detail="Company name or ID is required for company users")

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=data.role,
        company_id=company_id,
        must_reset_password=True,
        created_by=current_user.id
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    company_name = None
    if user.company_id:
        company = db.query(Company).filter(Company.id == user.company_id).first()
        company_name = company.name if company else None

    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        company_id=user.company_id,
        company_name=company_name,
        is_active=user.is_active,
        must_reset_password=user.must_reset_password,
        created_by=user.created_by,
        created_at=user.created_at,
    )


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("csp_admin")),
):
    """Update a user (admin only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.full_name is not None:
        user.full_name = data.full_name
    if data.role is not None:
        valid_roles = ["csp_admin", "csp_analyst", "company_user"]
        if data.role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role")
        user.role = data.role
    if data.company_id is not None:
        user.company_id = data.company_id
    if data.is_active is not None:
        user.is_active = data.is_active

    db.commit()
    db.refresh(user)

    company_name = None
    if user.company_id:
        company = db.query(Company).filter(Company.id == user.company_id).first()
        company_name = company.name if company else None

    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        company_id=user.company_id,
        company_name=company_name,
        is_active=user.is_active,
        must_reset_password=user.must_reset_password,
        created_by=user.created_by,
        created_at=user.created_at,
    )


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("csp_admin")),
):
    """Delete a user (admin only)."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"message": f"User '{user.full_name}' deleted"}
