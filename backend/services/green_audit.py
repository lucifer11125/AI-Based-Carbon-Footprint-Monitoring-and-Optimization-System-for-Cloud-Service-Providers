import json

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from models.sql_models import AuditResult, ProcessedMetric, UsageRecord


def run_green_audit(db: Session, dataset_id: int) -> dict:
    """Run a green audit using SQL aggregates for large-dataset performance."""
    existing = db.query(AuditResult).filter(AuditResult.dataset_id == dataset_id).first()
    if existing:
        return {
            "status": existing.status,
            "overall_score": existing.overall_score,
            "main_issue": existing.main_issue,
            "compute_efficiency": existing.compute_efficiency,
            "storage_utilization": existing.storage_utilization,
            "network_footprint": existing.network_footprint,
            "region_efficiency": existing.region_efficiency,
            "idle_waste_score": existing.idle_waste_score,
            "recommendations": json.loads(existing.recommendations_json),
        }

    metric_count = (
        db.query(func.count(ProcessedMetric.id))
        .filter(ProcessedMetric.dataset_id == dataset_id)
        .scalar()
    )
    stats = (
        db.query(
            func.count(UsageRecord.id).label("count"),
            func.avg(UsageRecord.idle_percent).label("avg_idle"),
            func.avg(UsageRecord.storage_gb).label("avg_storage"),
            func.max(UsageRecord.storage_gb).label("max_storage"),
            func.avg(UsageRecord.network_gb).label("avg_network"),
            func.avg(UsageRecord.cpu_hours).label("avg_cpu"),
            func.avg(UsageRecord.region_factor).label("avg_region_factor"),
            func.sum(case((UsageRecord.idle_percent > 20, 1), else_=0)).label("high_idle_count"),
        )
        .filter(UsageRecord.dataset_id == dataset_id)
        .one()
    )

    if not stats.count or not metric_count:
        return None

    count = int(stats.count or 0)
    avg_idle = float(stats.avg_idle or 0)
    avg_storage = float(stats.avg_storage or 0)
    max_storage = float(stats.max_storage or 0)
    avg_network = float(stats.avg_network or 0)
    avg_cpu = float(stats.avg_cpu or 0)
    avg_region_factor = float(stats.avg_region_factor or 0)
    high_idle_count = int(stats.high_idle_count or 0)

    compute_efficiency = max(0, min(100, 100 - avg_idle * 1.5))
    storage_ratio = avg_storage / max_storage if max_storage > 0 else 1
    storage_utilization = min(100, storage_ratio * 100)
    network_ratio = avg_network / (avg_cpu + 1)
    network_footprint = max(0, min(100, 100 - network_ratio * 5))
    region_efficiency = max(0, min(100, (1 - avg_region_factor) * 150))
    idle_waste_score = max(0, 100 - (high_idle_count / count * 100))

    overall_score = (
        compute_efficiency * 0.25
        + storage_utilization * 0.20
        + network_footprint * 0.15
        + region_efficiency * 0.25
        + idle_waste_score * 0.15
    )

    if overall_score >= 75:
        status = "Low"
    elif overall_score >= 50:
        status = "Moderate"
    else:
        status = "High"

    issues = []
    if compute_efficiency < 60:
        issues.append("High compute idle waste detected")
    if storage_utilization < 50:
        issues.append("Inconsistent storage utilization")
    if network_footprint < 60:
        issues.append("Excessive network data transfer")
    if region_efficiency < 50:
        issues.append("Workloads in high-carbon regions")
    if idle_waste_score < 60:
        issues.append("Significant idle resource waste")
    main_issue = issues[0] if issues else "No critical issues found"

    recommendations = []
    if compute_efficiency < 70:
        recommendations.append({
            "title": "Optimize Compute Resources",
            "description": f"Average idle rate is {avg_idle:.0f}%. Consider auto-scaling or right-sizing instances.",
            "priority": "High" if compute_efficiency < 50 else "Medium",
            "impact": f"-{int(avg_idle * 0.3)}% carbon reduction potential",
        })
    if region_efficiency < 60:
        recommendations.append({
            "title": "Migrate to Low-Carbon Regions",
            "description": f"Average region factor is {avg_region_factor:.2f}. Cleaner regions can reduce emissions for flexible workloads.",
            "priority": "High",
            "impact": f"-{int((1 - avg_region_factor * 0.3) * 30)}% carbon reduction potential",
        })
    if idle_waste_score < 70:
        recommendations.append({
            "title": "Implement Auto-Shutdown Policies",
            "description": f"{high_idle_count} records show more than 20% idle time. Schedule shutdowns for non-peak hours.",
            "priority": "Medium",
            "impact": f"-{int(high_idle_count / count * 20)}% energy waste reduction",
        })
    if storage_utilization < 60:
        recommendations.append({
            "title": "Implement Storage Tiering",
            "description": "Move infrequently accessed data to cold storage tiers to reduce energy usage.",
            "priority": "Medium",
            "impact": "-8% storage energy reduction",
        })
    if network_footprint < 70:
        recommendations.append({
            "title": "Optimize Network Transfer",
            "description": "High data transfer rates detected. Implement CDN and compression.",
            "priority": "Low",
            "impact": "-5% network energy reduction",
        })

    recommendations.append({
        "title": "Enable Carbon-Aware Scheduling",
        "description": "Schedule batch jobs during low-carbon grid periods for maximum sustainability.",
        "priority": "Low",
        "impact": "-10% estimated carbon reduction",
    })

    audit = AuditResult(
        dataset_id=dataset_id,
        status=status,
        overall_score=round(overall_score, 1),
        main_issue=main_issue,
        compute_efficiency=round(compute_efficiency, 1),
        storage_utilization=round(storage_utilization, 1),
        network_footprint=round(network_footprint, 1),
        region_efficiency=round(region_efficiency, 1),
        idle_waste_score=round(idle_waste_score, 1),
        recommendations_json=json.dumps(recommendations),
    )
    db.add(audit)
    db.commit()

    return {
        "status": status,
        "overall_score": round(overall_score, 1),
        "main_issue": main_issue,
        "compute_efficiency": round(compute_efficiency, 1),
        "storage_utilization": round(storage_utilization, 1),
        "network_footprint": round(network_footprint, 1),
        "region_efficiency": round(region_efficiency, 1),
        "idle_waste_score": round(idle_waste_score, 1),
        "recommendations": recommendations,
    }
