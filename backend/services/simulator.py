from sqlalchemy.orm import Session
from models.sql_models import UsageRecord, ProcessedMetric
from schemas.schemas import SimulationRequest
from core.config import REGION_EMISSION_FACTORS


def simulate_scenario(db: Session, dataset_id: int, req: SimulationRequest) -> dict:
    """
    Run a what-if carbon emission simulation based on parameter changes.
    Modify CPU, storage, idle, region, and renewable energy to see impact.
    """
    metrics = (
        db.query(ProcessedMetric)
        .filter(ProcessedMetric.dataset_id == dataset_id)
        .order_by(ProcessedMetric.year.desc(), ProcessedMetric.month.desc())
        .first()
    )
    recent_usage = (
        db.query(UsageRecord)
        .filter(UsageRecord.dataset_id == dataset_id)
        .order_by(UsageRecord.year.desc(), UsageRecord.month.desc())
        .first()
    )

    if not metrics or not recent_usage:
        return None

    baseline_carbon = metrics.total_carbon
    baseline_cost = recent_usage.monthly_cost

    # CPU carbon portion (~40%)
    cpu_portion = baseline_carbon * 0.40
    new_cpu = cpu_portion * (1 - req.cpu_reduction_percent / 100.0)

    # Storage carbon portion (~25%)
    storage_portion = baseline_carbon * 0.25
    new_storage = storage_portion * (1 - req.storage_optimization_percent / 100.0)

    # Network carbon portion (~20%) - unchanged
    network_portion = baseline_carbon * 0.20

    # Idle waste portion (~15%)
    idle_portion = baseline_carbon * 0.15
    new_idle = idle_portion * (1 - req.idle_reduction_percent / 100.0)

    # Region intensity shift
    current_factor = REGION_EMISSION_FACTORS.get(recent_usage.region, recent_usage.region_factor)
    region_ratio = req.region_shift_factor / current_factor if current_factor > 0 else 1.0

    # Renewable energy offset
    renewable_offset = 1.0 - (req.renewable_energy_percent / 100.0 * 0.8)

    simulated_carbon = (new_cpu + new_storage + network_portion + new_idle) * region_ratio * renewable_offset
    simulated_carbon = max(0, simulated_carbon)

    # Cost impact
    cost_savings_pct = (
        req.cpu_reduction_percent * 0.004 +
        req.storage_optimization_percent * 0.002 +
        req.idle_reduction_percent * 0.003
    )
    simulated_cost = baseline_cost * (1 - cost_savings_pct)

    carbon_change = simulated_carbon - baseline_carbon
    carbon_change_pct = (carbon_change / baseline_carbon * 100) if baseline_carbon > 0 else 0
    eff_change = -carbon_change_pct  # Positive = improvement

    return {
        "baseline_carbon": round(baseline_carbon, 4),
        "simulated_carbon": round(simulated_carbon, 4),
        "carbon_change": round(carbon_change, 4),
        "carbon_change_percent": round(carbon_change_pct, 2),
        "cost_change": round(simulated_cost - baseline_cost, 2),
        "efficiency_change": round(eff_change, 2),
        "baseline_cost": round(baseline_cost, 2),
        "simulated_cost": round(simulated_cost, 2),
    }
