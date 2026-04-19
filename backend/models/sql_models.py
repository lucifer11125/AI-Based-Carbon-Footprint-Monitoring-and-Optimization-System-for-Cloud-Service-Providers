from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="company_user")  # csp_admin, csp_analyst, company_user
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    must_reset_password = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="users")


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    industry = Column(String, default="Technology")
    region = Column(String, default="us-east-1")
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="company")
    datasets = relationship("Dataset", back_populates="company", cascade="all, delete-orphan")


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="datasets")
    usage_records = relationship("UsageRecord", back_populates="dataset", cascade="all, delete-orphan")
    metrics = relationship("ProcessedMetric", back_populates="dataset", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="dataset", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="dataset", cascade="all, delete-orphan")
    audit_results = relationship("AuditResult", back_populates="dataset", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="dataset", cascade="all, delete-orphan")


class UsageRecord(Base):
    __tablename__ = "usage_records"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    month = Column(Integer)
    year = Column(Integer)
    service = Column(String, default="General")
    region = Column(String, default="us-east-1")

    cpu_hours = Column(Float, default=0.0)
    storage_gb = Column(Float, default=0.0)
    network_gb = Column(Float, default=0.0)
    idle_percent = Column(Float, default=0.0)
    monthly_cost = Column(Float, default=0.0)
    region_factor = Column(Float, default=1.0)

    dataset = relationship("Dataset", back_populates="usage_records")


class ProcessedMetric(Base):
    __tablename__ = "processed_metrics"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    month = Column(Integer)
    year = Column(Integer)

    total_energy = Column(Float)
    total_carbon = Column(Float)
    carbon_intensity = Column(Float)
    cost_efficiency = Column(Float)
    sustainability_score = Column(Float, default=0.0)

    dataset = relationship("Dataset", back_populates="metrics")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    month_index = Column(Integer)
    month_name = Column(String)

    predicted_carbon = Column(Float)
    trend_direction = Column(String)
    confidence_score = Column(Float)

    dataset = relationship("Dataset", back_populates="predictions")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)

    title = Column(String)
    description = Column(String)
    priority = Column(String)
    implementation_effort = Column(String)

    expected_carbon_reduction = Column(Float)
    expected_cost_savings = Column(Float)

    dataset = relationship("Dataset", back_populates="recommendations")


class AuditResult(Base):
    __tablename__ = "audit_results"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)

    status = Column(String, default="Pending")  # Low / Moderate / High
    overall_score = Column(Float, default=0.0)
    main_issue = Column(String, default="")
    compute_efficiency = Column(Float, default=0.0)
    storage_utilization = Column(Float, default=0.0)
    network_footprint = Column(Float, default=0.0)
    region_efficiency = Column(Float, default=0.0)
    idle_waste_score = Column(Float, default=0.0)
    recommendations_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)

    dataset = relationship("Dataset", back_populates="audit_results")


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    report_type = Column(String, nullable=False)  # summary, detailed, audit
    title = Column(String, nullable=False)
    file_path = Column(String, nullable=True)
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    dataset = relationship("Dataset", back_populates="reports")


class SimulationState(Base):
    __tablename__ = "simulation_states"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)

    scenario_name = Column(String)
    baseline_carbon = Column(Float)
    simulated_carbon = Column(Float)
    cost_change = Column(Float)
    efficiency_change = Column(Float)
    parameters_json = Column(String)
