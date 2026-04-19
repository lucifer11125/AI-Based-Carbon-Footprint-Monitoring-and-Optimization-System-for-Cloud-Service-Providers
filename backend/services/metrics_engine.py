from sqlalchemy import func
from sqlalchemy.orm import Session

from models.sql_models import ProcessedMetric, UsageRecord


CPU_ENERGY_PUE = 0.003
STORAGE_ENERGY = 0.0001
NETWORK_ENERGY = 0.002
BASE_CARBON_INTENSITY = 0.40


def _energy_expr():
    base_energy = (
        UsageRecord.cpu_hours * CPU_ENERGY_PUE
        + UsageRecord.storage_gb * STORAGE_ENERGY
        + UsageRecord.network_gb * NETWORK_ENERGY
    )
    return base_energy * (1.0 + (UsageRecord.idle_percent / 100.0 * 0.25))


def _carbon_expr():
    return _energy_expr() * BASE_CARBON_INTENSITY * UsageRecord.region_factor


def compute_metrics_for_dataset(db: Session, dataset_id: int):
    """
    Compute monthly metrics for a dataset.

    Dashboards need monthly trend points, not one processed metric per raw CSV row.
    Aggregating in SQL keeps upload and dashboard performance stable for large files.
    """
    db.query(ProcessedMetric).filter(ProcessedMetric.dataset_id == dataset_id).delete()

    adjusted_energy = _energy_expr()
    carbon = _carbon_expr()
    idle_score = func.max(0, 100 - UsageRecord.idle_percent * 2)
    region_score = func.max(0, 100 - UsageRecord.region_factor * 100)
    sustainability = idle_score * 0.3 + region_score * 0.4 + 50 * 0.3

    monthly_rows = (
        db.query(
            UsageRecord.year.label("year"),
            UsageRecord.month.label("month"),
            func.sum(adjusted_energy).label("total_energy"),
            func.sum(carbon).label("total_carbon"),
            func.avg(BASE_CARBON_INTENSITY * UsageRecord.region_factor).label("carbon_intensity"),
            func.sum(UsageRecord.monthly_cost).label("total_cost"),
            func.avg(sustainability).label("sustainability_score"),
        )
        .filter(UsageRecord.dataset_id == dataset_id)
        .group_by(UsageRecord.year, UsageRecord.month)
        .order_by(UsageRecord.year, UsageRecord.month)
        .all()
    )

    metrics = []
    for row in monthly_rows:
        total_carbon = float(row.total_carbon or 0)
        total_cost = float(row.total_cost or 0)
        metrics.append(
            ProcessedMetric(
                dataset_id=dataset_id,
                month=int(row.month),
                year=int(row.year),
                total_energy=round(float(row.total_energy or 0), 4),
                total_carbon=round(total_carbon, 4),
                carbon_intensity=round(float(row.carbon_intensity or 0), 4),
                cost_efficiency=round(total_cost / total_carbon, 4) if total_carbon > 0 else 0,
                sustainability_score=round(float(row.sustainability_score or 0), 1),
            )
        )

    if metrics:
        db.bulk_save_objects(metrics)
    db.commit()


def get_dashboard_summary(db: Session, dataset_id: int) -> dict:
    """Get aggregated dashboard metrics for a dataset."""
    metrics = (
        db.query(ProcessedMetric)
        .filter(ProcessedMetric.dataset_id == dataset_id)
        .order_by(ProcessedMetric.year, ProcessedMetric.month)
        .all()
    )
    if not metrics:
        return None

    total_carbon = sum(m.total_carbon for m in metrics)
    total_energy = sum(m.total_energy for m in metrics)
    total_cost = float(
        db.query(func.coalesce(func.sum(UsageRecord.monthly_cost), 0))
        .filter(UsageRecord.dataset_id == dataset_id)
        .scalar()
    )
    avg_sustainability = sum(m.sustainability_score for m in metrics) / len(metrics)

    monthly_metrics = [
        {
            "year": m.year,
            "month": m.month,
            "total_carbon": round(m.total_carbon, 4),
            "total_energy": round(m.total_energy, 4),
            "sustainability_score": round(m.sustainability_score, 1),
        }
        for m in metrics
    ]

    if len(monthly_metrics) >= 2:
        prev = monthly_metrics[-2]
        last = monthly_metrics[-1]
        carbon_trend = (
            (last["total_carbon"] - prev["total_carbon"]) / prev["total_carbon"] * 100
            if prev["total_carbon"] > 0
            else 0
        )
        energy_trend = (
            (last["total_energy"] - prev["total_energy"]) / prev["total_energy"] * 100
            if prev["total_energy"] > 0
            else 0
        )
    else:
        carbon_trend = 0
        energy_trend = 0

    monthly_costs = (
        db.query(
            UsageRecord.year,
            UsageRecord.month,
            func.sum(UsageRecord.monthly_cost).label("cost"),
        )
        .filter(UsageRecord.dataset_id == dataset_id)
        .group_by(UsageRecord.year, UsageRecord.month)
        .order_by(UsageRecord.year, UsageRecord.month)
        .all()
    )
    cost_values = [float(row.cost or 0) for row in monthly_costs]
    if len(cost_values) >= 2 and cost_values[-2] > 0:
        cost_trend = (cost_values[-1] - cost_values[-2]) / cost_values[-2] * 100
    else:
        cost_trend = 0

    adjusted_energy = _energy_expr()
    carbon = _carbon_expr()
    region_rows = (
        db.query(
            UsageRecord.region.label("region"),
            func.sum(carbon).label("carbon"),
            func.sum(adjusted_energy).label("energy"),
            func.sum(UsageRecord.monthly_cost).label("cost"),
        )
        .filter(UsageRecord.dataset_id == dataset_id)
        .group_by(UsageRecord.region)
        .order_by(func.sum(carbon).desc())
        .limit(10)
        .all()
    )
    service_rows = (
        db.query(
            UsageRecord.service.label("service"),
            func.sum(carbon).label("carbon"),
            func.sum(UsageRecord.monthly_cost).label("cost"),
        )
        .filter(UsageRecord.dataset_id == dataset_id)
        .group_by(UsageRecord.service)
        .order_by(func.sum(carbon).desc())
        .limit(10)
        .all()
    )

    return {
        "total_carbon": round(total_carbon, 2),
        "total_energy": round(total_energy, 2),
        "total_cost": round(total_cost, 2),
        "sustainability_score": round(avg_sustainability, 1),
        "carbon_trend": round(carbon_trend, 1),
        "energy_trend": round(energy_trend, 1),
        "cost_trend": round(cost_trend, 1),
        "metrics": monthly_metrics,
        "region_breakdown": [
            {
                "region": row.region or "unknown",
                "carbon": round(float(row.carbon or 0), 4),
                "energy": round(float(row.energy or 0), 4),
                "cost": round(float(row.cost or 0), 2),
            }
            for row in region_rows
        ],
        "service_breakdown": [
            {
                "service": row.service or "General",
                "carbon": round(float(row.carbon or 0), 4),
                "cost": round(float(row.cost or 0), 2),
            }
            for row in service_rows
        ],
    }
