from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from core.database import get_db
from core.auth import get_current_user
from models.sql_models import User, Dataset, Report, Company
from schemas.schemas import ReportCreate, ReportResponse

router = APIRouter()


@router.post("/", response_model=ReportResponse)
def create_report(
    data: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a report record for tracking."""
    dataset = db.query(Dataset).filter(Dataset.id == data.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Access control
    if current_user.role == "company_user" and current_user.company_id != dataset.company_id:
        raise HTTPException(status_code=403, detail="Access denied")

    title_map = {
        "summary": "Carbon Summary Report",
        "detailed": "Detailed Analytics Report",
        "audit": "Green Audit Certificate",
    }

    report = Report(
        dataset_id=data.dataset_id,
        company_id=dataset.company_id,
        report_type=data.report_type,
        title=title_map.get(data.report_type, "Report"),
        generated_by=current_user.id,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


from fastapi import UploadFile, File, Form
import os
import shutil

@router.post("/upload", response_model=ReportResponse)
def upload_report(
    dataset_id: int = Form(...),
    report_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a custom report file."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if current_user.role == "company_user" and current_user.company_id != dataset.company_id:
        raise HTTPException(status_code=403, detail="Access denied")

    os.makedirs("uploads/reports", exist_ok=True)
    file_path = f"uploads/reports/{dataset.company_id}_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    title_map = {
        "summary": "Carbon Summary Report",
        "detailed": "Detailed Analytics Report",
        "audit": "Green Audit Certificate",
    }

    report = Report(
        dataset_id=dataset_id,
        company_id=dataset.company_id,
        report_type=report_type,
        title=title_map.get(report_type, "Uploaded Report"),
        file_path=file_path,
        generated_by=current_user.id,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/", response_model=List[ReportResponse])
def list_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List reports based on role:
    - Admin: all reports
    - Analyst: reports for selected company (all accessible)
    - Company: own company reports only
    """
    if current_user.role == "csp_admin":
        reports = db.query(Report).order_by(Report.created_at.desc()).all()
    elif current_user.role == "csp_analyst":
        # Analyst can see all reports
        reports = db.query(Report).order_by(Report.created_at.desc()).all()
    else:
        # Company user: own company only
        if not current_user.company_id:
            return []
        reports = (
            db.query(Report)
            .filter(Report.company_id == current_user.company_id)
            .order_by(Report.created_at.desc())
            .all()
        )
    return reports


@router.get("/company/{company_id}", response_model=List[ReportResponse])
def list_company_reports(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List reports for a specific company."""
    if current_user.role == "company_user" and current_user.company_id != company_id:
        raise HTTPException(status_code=403, detail="Access denied")

    reports = (
        db.query(Report)
        .filter(Report.company_id == company_id)
        .order_by(Report.created_at.desc())
        .all()
    )
    return reports


@router.delete("/{report_id}")
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a report."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if current_user.role == "company_user" and current_user.company_id != report.company_id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(report)
    db.commit()
    return {"message": "Report deleted"}

from fastapi.responses import FileResponse

@router.get("/{report_id}/download")
def download_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if current_user.role == "company_user" and current_user.company_id != report.company_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not report.file_path or not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(path=report.file_path, filename=os.path.basename(report.file_path))
