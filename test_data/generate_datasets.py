"""Generate large realistic cloud usage CSV datasets for CarbonLens testing."""

import csv
import random
import math
import os

random.seed(42)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__))
os.makedirs(OUTPUT_DIR, exist_ok=True)

REGIONS = [
    ("us-east", 0.40),
    ("us-west", 0.32),
    ("eu-central", 0.25),
    ("asia-south", 0.55),
]


def generate_dataset(
    filename,
    rows,
    base_cpu,
    base_storage,
    base_network,
    base_cost,
    idle_range,
    region_weights,
    seasonal=True,
):
    """Generate a single CSV dataset with realistic patterns."""
    filepath = os.path.join(OUTPUT_DIR, filename)

    with open(filepath, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "month",
                "year",
                "cpu_hours",
                "storage_gb",
                "network_gb",
                "idle_percent",
                "monthly_cost",
                "region_factor",
            ]
        )

        for i in range(rows):
            month = (i % 12) + 1
            year = 2022 + (i // 12) % 4  # 2022–2025 cycle

            # Seasonal variation (higher in winter for heating/compute spikes)
            if seasonal:
                seasonal_factor = 1.0 + 0.15 * math.sin((month - 1) * math.pi / 6)
            else:
                seasonal_factor = 1.0

            # Gradual growth trend
            growth = 1.0 + (i / rows) * 0.3  # 30% growth over dataset

            # Random daily noise
            noise = random.gauss(1.0, 0.12)

            # Pick region
            region_name, region_factor = random.choices(
                REGIONS, weights=region_weights, k=1
            )[0]

            cpu = max(10, base_cpu * seasonal_factor * growth * noise)
            storage = max(5, base_storage * growth * random.gauss(1.0, 0.08))
            network = max(1, base_network * seasonal_factor * noise * growth)
            idle = max(0, min(100, random.gauss(idle_range[0], idle_range[1])))
            cost = max(50, base_cost * growth * noise * (1 + idle / 200))

            writer.writerow(
                [
                    month,
                    year,
                    round(cpu, 1),
                    round(storage, 1),
                    round(network, 1),
                    round(idle, 1),
                    round(cost, 2),
                    region_factor,
                ]
            )

    print(f"Generated {filepath} — {rows} rows")


# ---- Dataset 1: Auth Service (moderate compute, low storage) ----
generate_dataset(
    filename="auth_service.csv",
    rows=10000,
    base_cpu=800,
    base_storage=120,
    base_network=200,
    base_cost=1800,
    idle_range=(18, 6),
    region_weights=[50, 20, 20, 10],
    seasonal=True,
)

# ---- Dataset 2: ML Pipeline (heavy compute, high storage, expensive) ----
generate_dataset(
    filename="ml_pipeline.csv",
    rows=10000,
    base_cpu=4500,
    base_storage=2800,
    base_network=1500,
    base_cost=9500,
    idle_range=(8, 3),
    region_weights=[30, 40, 20, 10],
    seasonal=True,
)

# ---- Dataset 3: API Gateway (high network, moderate compute) ----
generate_dataset(
    filename="api_gateway.csv",
    rows=10000,
    base_cpu=1200,
    base_storage=300,
    base_network=3500,
    base_cost=4200,
    idle_range=(12, 4),
    region_weights=[40, 15, 30, 15],
    seasonal=False,
)

print("\nAll 3 datasets generated successfully!")
