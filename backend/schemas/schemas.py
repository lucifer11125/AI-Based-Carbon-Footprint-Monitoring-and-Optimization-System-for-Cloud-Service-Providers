from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


# ─── Auth ───
class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "company_user"
    company_name: Optional[str] = None  # For company_user: auto-creates or links to existing company
    company_id: Optional[int] = None


class UserLogin(BaseModel):
    email: str
    password: str


class PasswordReset(BaseModel):
    current_password: str
    new_password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    is_active: bool = True
    must_reset_password: bool = False
    created_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    company_id: Optional[int] = None
    is_active: Optional[bool] = None


# ─── Company ───
class CompanyCreate(BaseModel):
    name: str
    industry: str = "Technology"
    region: str = "us-east-1"


class CompanyResponse(BaseModel):
    id: int
    name: str
    industry: str
    region: str
    created_at: datetime

    class Config:
        from_attributes = True


class CompanyDetail(CompanyResponse):
    dataset_count: int = 0
    total_carbon: float = 0.0
    total_energy: float = 0.0
    total_cost: float = 0.0
    sustainability_score: float = 0.0
    user_count: int = 0


# ─── Dataset ───
class DatasetResponse(BaseModel):
    id: int
    name: str
    company_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Metrics ───
class MetricResponse(BaseModel):
    id: int
    dataset_id: int
    month: int
    year: int
    total_energy: float
    total_carbon: float
    carbon_intensity: float
    cost_efficiency: float
    sustainability_score: float = 0.0

    class Config:
        from_attributes = True


class DashboardSummary(BaseModel):
    total_carbon: float
    total_energy: float
    total_cost: float
    sustainability_score: float
    carbon_trend: float  # % change
    energy_trend: float
    cost_trend: float
    metrics: List[MetricResponse]
    predictions: List[PredictionResponse]
    region_breakdown: list
    service_breakdown: list


# ─── Prediction ───
class PredictionResponse(BaseModel):
    month_name: str
    predicted_carbon: float
    trend_direction: str
    confidence_score: float

    class Config:
        from_attributes = True


# ─── Recommendation ───
class RecommendationResponse(BaseModel):
    id: int
    title: str
    description: str
    priority: str
    implementation_effort: str
    expected_carbon_reduction: float
    expected_cost_savings: float

    class Config:
        from_attributes = True


# ─── Audit ───
class AuditResponse(BaseModel):
    status: str
    overall_score: float
    main_issue: str
    compute_efficiency: float
    storage_utilization: float
    network_footprint: float
    region_efficiency: float
    idle_waste_score: float
    recommendations_json: str

    class Config:
        from_attributes = True


# ─── Simulator ───
class SimulationRequest(BaseModel):
    cpu_reduction_percent: float = 0.0
    storage_optimization_percent: float = 0.0
    region_shift_factor: float = 1.0
    idle_reduction_percent: float = 0.0
    renewable_energy_percent: float = 0.0


class SimulationResponse(BaseModel):
    baseline_carbon: float
    simulated_carbon: float
    carbon_change: float
    carbon_change_percent: float
    cost_change: float
    efficiency_change: float
    baseline_cost: float
    simulated_cost: float


# ─── Reports ───
class ReportCreate(BaseModel):
    dataset_id: int
    report_type: str = "summary"  # summary, detailed, audit


class ReportResponse(BaseModel):
    id: int
    dataset_id: int
    company_id: int
    report_type: str
    title: str
    file_path: Optional[str] = None
    generated_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Admin ───
class AdminOverview(BaseModel):
    total_companies: int
    total_users: int
    total_datasets: int
    total_carbon: float
    total_energy: float
    total_cost: float
    avg_sustainability: float
    company_rankings: list
