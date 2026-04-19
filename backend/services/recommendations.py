from sqlalchemy import case, func
from sqlalchemy.orm import Session

from models import sql_models


def generate_recommendations(db: Session, dataset_id: int):
    """Generate recommendations from aggregate stats instead of raw-row scans."""
    latest_metric = (
        db.query(sql_models.ProcessedMetric)
        .filter(sql_models.ProcessedMetric.dataset_id == dataset_id)
        .order_by(sql_models.ProcessedMetric.year.desc(), sql_models.ProcessedMetric.month.desc())
        .first()
    )
    usage_stats = (
        db.query(
            func.count(sql_models.UsageRecord.id).label("count"),
            func.avg(sql_models.UsageRecord.idle_percent).label("avg_idle"),
            func.max(sql_models.UsageRecord.idle_percent).label("max_idle"),
            func.avg(sql_models.UsageRecord.cpu_hours).label("avg_cpu"),
            func.avg(sql_models.UsageRecord.storage_gb).label("avg_storage"),
            func.avg(sql_models.UsageRecord.network_gb).label("avg_network"),
            func.avg(sql_models.UsageRecord.monthly_cost).label("avg_cost"),
            func.sum(sql_models.UsageRecord.monthly_cost).label("total_cost"),
            func.sum(sql_models.UsageRecord.monthly_cost).label("latest_cost"),
            func.sum(case((sql_models.UsageRecord.region_factor > 0.35, 1), else_=0)).label("high_region_count"),
        )
        .filter(sql_models.UsageRecord.dataset_id == dataset_id)
        .one()
    )

    db.query(sql_models.Recommendation).filter(
        sql_models.Recommendation.dataset_id == dataset_id
    ).delete()
    db.commit()

    if not latest_metric or not usage_stats.count:
        return

    latest_usage = (
        db.query(sql_models.UsageRecord)
        .filter(sql_models.UsageRecord.dataset_id == dataset_id)
        .order_by(sql_models.UsageRecord.year.desc(), sql_models.UsageRecord.month.desc())
        .first()
    )

    avg_idle = float(usage_stats.avg_idle or 0)
    avg_cost = float(usage_stats.avg_cost or 0)
    avg_cpu = float(usage_stats.avg_cpu or 0)
    avg_storage = float(usage_stats.avg_storage or 0)
    avg_network = float(usage_stats.avg_network or 0)
    max_idle = float(usage_stats.max_idle or 0)
    latest_cost = float(latest_usage.monthly_cost if latest_usage else 0)
    high_region_count = int(usage_stats.high_region_count or 0)
    total_count = int(usage_stats.count or 0)

    recs = []

    if avg_idle > 10:
        recs.append(sql_models.Recommendation(
            dataset_id=dataset_id,
            title="Shut Down Idle Resources",
            description=f"Your instances average {avg_idle:.0f}% idle time (peak {max_idle:.0f}%). Implement auto-stopping for non-production workloads during off-hours.",
            priority="High",
            implementation_effort="Medium",
            expected_carbon_reduction=round(latest_metric.total_carbon * (avg_idle / 100.0) * 0.5, 2),
            expected_cost_savings=round(latest_cost * (avg_idle / 100.0 * 0.4), 2),
        ))

    if avg_cpu > 500:
        recs.append(sql_models.Recommendation(
            dataset_id=dataset_id,
            title="Right-size CPU Allocations",
            description=f"Average CPU usage is {avg_cpu:.0f} hours/month. Downgrade over-provisioned instances and consider efficient instance families.",
            priority="Medium",
            implementation_effort="Low",
            expected_carbon_reduction=round(latest_metric.total_carbon * 0.12, 2),
            expected_cost_savings=round(latest_cost * 0.15, 2),
        ))

    if high_region_count > total_count * 0.3:
        recs.append(sql_models.Recommendation(
            dataset_id=dataset_id,
            title="Migrate to Low-Carbon Regions",
            description="Over 30% of workloads run in regions with higher carbon intensity. Move flexible workloads to cleaner regions where latency allows.",
            priority="High",
            implementation_effort="High",
            expected_carbon_reduction=round(latest_metric.total_carbon * 0.3, 2),
            expected_cost_savings=0.0,
        ))

    if avg_storage > 3000:
        recs.append(sql_models.Recommendation(
            dataset_id=dataset_id,
            title="Implement Storage Tiering",
            description=f"Average storage usage is {avg_storage:.0f} GB/month. Move infrequently accessed data to cold/archive tiers and apply lifecycle policies.",
            priority="Medium",
            implementation_effort="Low",
            expected_carbon_reduction=round(latest_metric.total_carbon * 0.08, 2),
            expected_cost_savings=round(latest_cost * 0.12, 2),
        ))

    if avg_network > 5000:
        recs.append(sql_models.Recommendation(
            dataset_id=dataset_id,
            title="Optimize Network Data Transfer",
            description=f"Average network transfer is {avg_network:.0f} GB/month. Use CDN caching, compression, and private endpoints to reduce transfer overhead.",
            priority="Medium",
            implementation_effort="Medium",
            expected_carbon_reduction=round(latest_metric.total_carbon * 0.06, 2),
            expected_cost_savings=round(latest_cost * 0.08, 2),
        ))

    recs.extend([
        sql_models.Recommendation(
            dataset_id=dataset_id,
            title="Adopt Serverless & Container Orchestration",
            description="Move suitable workloads to serverless functions and autoscaled containers to reduce idle compute.",
            priority="Medium",
            implementation_effort="High",
            expected_carbon_reduction=round(latest_metric.total_carbon * 0.15, 2),
            expected_cost_savings=round(latest_cost * 0.2, 2),
        ),
        sql_models.Recommendation(
            dataset_id=dataset_id,
            title="Implement Carbon-Aware Job Scheduling",
            description="Schedule non-urgent batch jobs during lower-carbon grid periods or in cleaner regions.",
            priority="Medium",
            implementation_effort="Medium",
            expected_carbon_reduction=round(latest_metric.total_carbon * 0.1, 2),
            expected_cost_savings=round(latest_cost * 0.05, 2),
        ),
        sql_models.Recommendation(
            dataset_id=dataset_id,
            title="Deploy Carbon Observability Dashboard",
            description="Track carbon spikes, idle resources, and emissions per workload in your observability stack.",
            priority="Low",
            implementation_effort="Low",
            expected_carbon_reduction=round(latest_metric.total_carbon * 0.05, 2),
            expected_cost_savings=0.0,
        ),
    ])

    if avg_cost > 10000:
        recs.append(sql_models.Recommendation(
            dataset_id=dataset_id,
            title="Purchase Reserved Capacity",
            description=f"Average monthly spend is ${avg_cost:,.0f}. Reserve stable workloads to reduce costs and fund sustainability work.",
            priority="Low",
            implementation_effort="Low",
            expected_carbon_reduction=0.0,
            expected_cost_savings=round(latest_cost * 0.35, 2),
        ))

    db.add_all(recs)
    db.commit()
