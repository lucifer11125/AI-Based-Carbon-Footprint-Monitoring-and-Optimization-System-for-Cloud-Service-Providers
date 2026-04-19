from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import engine, Base, SessionLocal
from core.auth import hash_password
from sqlalchemy import text

# Import all models to register with Base.metadata
from models import sql_models  # noqa: F401

# Create all tables
Base.metadata.create_all(bind=engine)

with engine.begin() as conn:
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_usage_records_dataset_year_month ON usage_records (dataset_id, year, month)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_usage_records_dataset_region ON usage_records (dataset_id, region)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_usage_records_dataset_service ON usage_records (dataset_id, service)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_processed_metrics_dataset_year_month ON processed_metrics (dataset_id, year, month)"))

app = FastAPI(
    title="CarbonLens AI API",
    description="Multi-tenant SaaS platform for cloud carbon emission monitoring and optimization.",
    version="4.0.0",
)

# CORS for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import time
from fastapi import Request
import logging

logger = logging.getLogger("slow_requests")
logger.setLevel(logging.INFO)
ch = logging.StreamHandler()
ch.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))
logger.addHandler(ch)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    # Log any request that takes longer than 1 second
    if process_time > 1.0:
        logger.warning(f"SLOW REQUEST: {request.method} {request.url.path} took {process_time:.4f}s")
    return response

# Import and register routers
from api.endpoints import auth, companies, datasets, admin, reports

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(companies.router, prefix="/api/companies", tags=["companies"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])


@app.on_event("startup")
def seed_admin():
    """Seed a default admin user if none exists."""
    db = SessionLocal()
    try:
        existing = db.query(sql_models.User).filter(
            sql_models.User.role == "csp_admin"
        ).first()
        if not existing:
            admin_user = sql_models.User(
                email="admin@carbonlens.ai",
                hashed_password=hash_password("admin123"),
                full_name="Platform Admin",
                role="csp_admin",
                company_id=None,
            )
            db.add(admin_user)
            db.commit()
            print("[OK] Seeded default admin: admin@carbonlens.ai / admin123")
        else:
            print("[OK] Admin user already exists")
    finally:
        db.close()


@app.get("/health")
def health_check():
    return {"status": "ok", "version": "4.0.1", "performance_patch": True}
