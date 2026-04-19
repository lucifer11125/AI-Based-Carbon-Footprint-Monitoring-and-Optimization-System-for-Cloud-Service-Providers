from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from core.database import get_db
from core.auth import get_current_user, require_role
from models.sql_models import User, Company, Dataset, ProcessedMetric, UsageRecord
from schemas.schemas import CompanyCreate, CompanyResponse, CompanyDetail

router = APIRouter()


@router.get("/", response_model=List[CompanyResponse])
def list_companies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List companies based on user role."""
    if current_user.role == "company_user":
        if current_user.company_id:
            companies = db.query(Company).filter(Company.id == current_user.company_id).all()
        else:
            companies = []
    else:
        # Admin and Analyst can see all companies
        companies = db.query(Company).all()
    return companies


@router.post("/", response_model=CompanyResponse)
def create_company(
    data: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("csp_admin")),
):
    """Create a new company (admin only)."""
    existing = db.query(Company).filter(Company.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Company name already exists")

    company = Company(name=data.name, industry=data.industry, region=data.region)
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.get("/{company_id}", response_model=CompanyDetail)
def get_company_detail(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get company details with aggregated metrics."""
    # Access control
    if current_user.role == "company_user" and current_user.company_id != company_id:
        raise HTTPException(status_code=403, detail="Access denied to this company")

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    dataset_count = db.query(Dataset).filter(Dataset.company_id == company_id).count()
    user_count = db.query(User).filter(User.company_id == company_id).count()

    metric_totals = (
        db.query(
            func.coalesce(func.sum(ProcessedMetric.total_carbon), 0),
            func.coalesce(func.sum(ProcessedMetric.total_energy), 0),
            func.coalesce(func.avg(ProcessedMetric.sustainability_score), 0),
        )
        .join(Dataset, Dataset.id == ProcessedMetric.dataset_id)
        .filter(Dataset.company_id == company_id)
        .one()
    )
    total_cost = (
        db.query(func.coalesce(func.sum(UsageRecord.monthly_cost), 0))
        .join(Dataset, Dataset.id == UsageRecord.dataset_id)
        .filter(Dataset.company_id == company_id)
        .scalar()
        or 0
    )

    return CompanyDetail(
        id=company.id,
        name=company.name,
        industry=company.industry,
        region=company.region,
        created_at=company.created_at,
        dataset_count=dataset_count,
        total_carbon=round(metric_totals[0] or 0, 2),
        total_energy=round(metric_totals[1] or 0, 2),
        total_cost=round(total_cost, 2),
        sustainability_score=round(metric_totals[2] or 0, 1),
        user_count=user_count,
    )


@router.delete("/{company_id}")
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("csp_admin")),
):
    """Delete a company and all its data (admin only)."""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    db.delete(company)
    db.commit()
    return {"message": f"Company '{company.name}' and all related data deleted"}
