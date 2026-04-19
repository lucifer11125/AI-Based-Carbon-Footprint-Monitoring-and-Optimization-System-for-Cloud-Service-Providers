import io
import csv
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from math import isfinite

from core.database import get_db
from core.auth import get_current_user, require_role, enforce_company_id
from core.config import REGION_EMISSION_FACTORS
from models.sql_models import (
    User, Company, Dataset, UsageRecord, ProcessedMetric,
    Prediction, Recommendation, AuditResult
)
from schemas.schemas import (
    DatasetResponse, MetricResponse, PredictionResponse,
    RecommendationResponse, DashboardSummary, AuditResponse,
    SimulationRequest, SimulationResponse,
)
from services.metrics_engine import compute_metrics_for_dataset, get_dashboard_summary
from services.ai_predictor import train_and_predict
from services.recommendations import generate_recommendations
from services.green_audit import run_green_audit
from services.simulator import simulate_scenario

router = APIRouter()

REQUIRED_COLUMNS = {"month", "year", "cpu_hours", "storage_gb", "network_gb"}

REGION_ALIASES = {
    "IN": "ap-south-1",
    "INDIA": "ap-south-1",
    "US": "us-east-1",
    "USA": "us-east-1",
    "UNITED_STATES": "us-east-1",
    "UK": "eu-west-1",
    "GB": "eu-west-1",
}


def _to_float(value, default: float = 0.0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    return parsed if isfinite(parsed) else default


def _to_int(value, default: int) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def _normalize_region(value) -> str:
    region = str(value or "us-east-1").strip()
    return REGION_ALIASES.get(region.upper().replace(" ", "_"), region)


def _validate_dataset_access(db: Session, dataset_id: int, current_user: User):
    """Validate dataset exists and user has access."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    if current_user.role == "company_user" and current_user.company_id != dataset.company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return dataset


@router.post("/upload/{company_id}", response_model=DatasetResponse)
async def upload_dataset(
    company_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a CSV dataset. Only company users and admins can upload."""
    # Analysts cannot upload
    if current_user.role == "csp_analyst":
        raise HTTPException(status_code=403, detail="Analysts cannot upload datasets")

    # CRITICAL: For company users, override company_id with their own
    actual_company_id = enforce_company_id(current_user, company_id)

    if not actual_company_id:
        raise HTTPException(status_code=400, detail="No company associated with your account")

    company = db.query(Company).filter(Company.id == actual_company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if not file.filename.endswith((".csv", ".CSV")):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    # Check for duplicate
    existing = db.query(Dataset).filter(
        Dataset.company_id == actual_company_id,
        Dataset.name == file.filename
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Dataset '{file.filename}' already exists for this company")

    # Read and validate CSV
    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")

    # Normalize column names
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {missing}. Required: {REQUIRED_COLUMNS}"
        )

    try:
        # Create dataset
        dataset = Dataset(
            name=file.filename,
            company_id=actual_company_id,
            uploaded_by=current_user.id,
        )
        db.add(dataset)
        db.commit()
        db.refresh(dataset)

        # Parse records efficiently
        records_to_insert = []
        # Fill NA values to prevent parsing errors
        df = df.fillna({
            "month": 1, "year": 2024, "service": "General",
            "service_type": "General", "region": "us-east-1",
            "cpu_hours": 0, "storage_gb": 0, "network_gb": 0,
            "idle_percent": 0, "idle_%": 0, "monthly_cost": 0,
            "cost": 0, "cost_usd": 0, "region_factor": 0,
        })

        # Convert to dictionaries for fast bulk insert. This avoids constructing
        # thousands of ORM objects before SQLite receives the rows.
        for row in df.to_dict('records'):
            # Fallback fields depending on what was identified in the df
            service_val = str(row.get("service") or row.get("service_type") or "General")
            region_val = _normalize_region(row.get("region", "us-east-1"))
            region_factor = _to_float(
                row.get("region_factor"),
                REGION_EMISSION_FACTORS.get(region_val, 0.4),
            )

            records_to_insert.append({
                "dataset_id": dataset.id,
                "month": _to_int(row.get("month"), 1),
                "year": _to_int(row.get("year"), 2024),
                "service": service_val,
                "region": region_val,
                "cpu_hours": max(0, _to_float(row.get("cpu_hours"))),
                "storage_gb": max(0, _to_float(row.get("storage_gb"))),
                "network_gb": max(0, _to_float(row.get("network_gb"))),
                "idle_percent": _clamp(_to_float(row.get("idle_percent") or row.get("idle_%")), 0, 100),
                "monthly_cost": max(0, _to_float(row.get("monthly_cost") or row.get("cost") or row.get("cost_usd"))),
                "region_factor": region_factor,
            })

        # Bulk insert for speed
        db.bulk_insert_mappings(UsageRecord, records_to_insert)
        db.commit()

        # Auto-process: metrics, predictions, recommendations, and audit
        compute_metrics_for_dataset(db, dataset.id)
        train_and_predict(db, dataset.id)
        generate_recommendations(db, dataset.id)
        run_green_audit(db, dataset.id)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        if "dataset" in locals() and dataset.id:
            existing_dataset = db.query(Dataset).filter(Dataset.id == dataset.id).first()
            if existing_dataset:
                db.delete(existing_dataset)
                db.commit()
        raise HTTPException(status_code=400, detail=f"Failed to process CSV: {str(e)}")

    return dataset


@router.get("/company/{company_id}", response_model=List[DatasetResponse])
def list_datasets(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all datasets for a company."""
    # Enforce company access for company users
    actual_company_id = enforce_company_id(current_user, company_id)
    if not actual_company_id:
        return []

    datasets = db.query(Dataset).filter(Dataset.company_id == actual_company_id).all()
    return datasets


@router.get("/{dataset_id}/dashboard")
def get_dataset_dashboard(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get dashboard summary for a specific dataset."""
    dataset = _validate_dataset_access(db, dataset_id, current_user)

    summary = get_dashboard_summary(db, dataset_id)
    if not summary:
        raise HTTPException(status_code=404, detail="No metrics available. Upload a dataset first.")

    # Fetch predictions to bundle into the same response
    preds = db.query(Prediction).filter(Prediction.dataset_id == dataset_id).all()
    if not preds:
        preds = train_and_predict(db, dataset_id)

    # Metrics are already returned as monthly aggregate dictionaries.
    summary["predictions"] = [PredictionResponse.model_validate(p) for p in preds]
    return summary


@router.get("/{dataset_id}/predictions", response_model=List[PredictionResponse])
def get_predictions(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI predictions for a dataset."""
    dataset = _validate_dataset_access(db, dataset_id, current_user)

    preds = db.query(Prediction).filter(Prediction.dataset_id == dataset_id).all()
    if not preds:
        preds = train_and_predict(db, dataset_id)
    return preds


@router.get("/{dataset_id}/recommendations", response_model=List[RecommendationResponse])
def get_recommendations(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get optimization recommendations for a dataset."""
    dataset = _validate_dataset_access(db, dataset_id, current_user)

    recs = db.query(Recommendation).filter(Recommendation.dataset_id == dataset_id).all()
    return recs


@router.get("/{dataset_id}/audit")
def get_audit(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run green audit for a dataset."""
    dataset = _validate_dataset_access(db, dataset_id, current_user)

    result = run_green_audit(db, dataset_id)
    if not result:
        raise HTTPException(status_code=404, detail="Not enough data for audit")
    return result


@router.get("/{dataset_id}/preview")
def preview_dataset(
    dataset_id: int,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Preview normalized rows from an uploaded dataset."""
    dataset = _validate_dataset_access(db, dataset_id, current_user)

    total_records = db.query(UsageRecord).filter(UsageRecord.dataset_id == dataset_id).count()
    rows = (
        db.query(UsageRecord)
        .filter(UsageRecord.dataset_id == dataset_id)
        .order_by(UsageRecord.year, UsageRecord.month, UsageRecord.id)
        .limit(limit)
        .all()
    )

    columns = [
        "month",
        "year",
        "service",
        "region",
        "cpu_hours",
        "storage_gb",
        "network_gb",
        "idle_percent",
        "monthly_cost",
        "region_factor",
    ]
    return {
        "dataset": DatasetResponse.model_validate(dataset),
        "columns": columns,
        "rows": [
            {
                "month": row.month,
                "year": row.year,
                "service": row.service,
                "region": row.region,
                "cpu_hours": row.cpu_hours,
                "storage_gb": row.storage_gb,
                "network_gb": row.network_gb,
                "idle_percent": row.idle_percent,
                "monthly_cost": row.monthly_cost,
                "region_factor": row.region_factor,
            }
            for row in rows
        ],
        "total_records": total_records,
    }


@router.get("/{dataset_id}/download")
def download_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download a dataset as CSV using the normalized records stored after upload."""
    dataset = _validate_dataset_access(db, dataset_id, current_user)

    rows = (
        db.query(UsageRecord)
        .filter(UsageRecord.dataset_id == dataset_id)
        .order_by(UsageRecord.year, UsageRecord.month, UsageRecord.id)
        .all()
    )
    if not rows:
        raise HTTPException(status_code=404, detail="No records available for this dataset")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "month",
        "year",
        "service",
        "region",
        "cpu_hours",
        "storage_gb",
        "network_gb",
        "idle_percent",
        "monthly_cost",
        "region_factor",
    ])
    for row in rows:
        writer.writerow([
            row.month,
            row.year,
            row.service,
            row.region,
            row.cpu_hours,
            row.storage_gb,
            row.network_gb,
            row.idle_percent,
            row.monthly_cost,
            row.region_factor,
        ])

    output.seek(0)
    safe_name = "".join(ch if ch.isalnum() or ch in ("-", "_", ".") else "_" for ch in dataset.name)
    if not safe_name.lower().endswith(".csv"):
        safe_name = f"{safe_name}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )


@router.post("/{dataset_id}/simulate")
def run_simulation(
    dataset_id: int,
    req: SimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run what-if simulation for a dataset."""
    dataset = _validate_dataset_access(db, dataset_id, current_user)

    # Company users cannot run simulations  
    if current_user.role == "company_user":
        raise HTTPException(status_code=403, detail="Company users cannot run simulations")

    result = simulate_scenario(db, dataset_id, req)
    if not result:
        raise HTTPException(status_code=404, detail="Not enough data for simulation")
    return result


@router.delete("/{dataset_id}")
def delete_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a dataset and all its processed data."""
    dataset = _validate_dataset_access(db, dataset_id, current_user)

    db.delete(dataset)
    db.commit()
    return {"message": f"Dataset '{dataset.name}' deleted"}
