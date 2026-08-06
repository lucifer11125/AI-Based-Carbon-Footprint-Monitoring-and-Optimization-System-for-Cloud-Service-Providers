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
    logger.info(f"INCOMING REQUEST: {request.method} {request.url.path} (scope_path={request.scope.get('path')})")
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    if process_time > 1.0:
        logger.warning(f"SLOW REQUEST: {request.method} {request.url.path} took {process_time:.4f}s")
    return response

# Import and register routers (both with /api prefix and direct prefix for resilience)
from api.endpoints import auth, companies, datasets, admin, reports

for prefix in ["/api", ""]:
    app.include_router(auth.router, prefix=f"{prefix}/auth", tags=["auth"])
    app.include_router(companies.router, prefix=f"{prefix}/companies", tags=["companies"])
    app.include_router(datasets.router, prefix=f"{prefix}/datasets", tags=["datasets"])
    app.include_router(admin.router, prefix=f"{prefix}/admin", tags=["admin"])
    app.include_router(reports.router, prefix=f"{prefix}/reports", tags=["reports"])


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


@app.get("/")
@app.get("/api")
@app.get("/api/index.py")
@app.get("/api/index")
@app.get("/health")
@app.get("/api/health")
def health_check(request: Request):
    return {
        "status": "ok",
        "version": "4.0.1",
        "path": request.url.path,
        "scope_path": request.scope.get("path"),
    }


# ─── All-in-One Static & SPA Frontend Serving (Localhost Only) ──────────────
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# On Vercel, static files & SPA routing are handled by Vercel CDN and vercel.json
_on_vercel = bool(os.environ.get("VERCEL"))

if not _on_vercel:
    _possible_dist_dirs = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "static")),
    ]
    FRONTEND_DIST = next((d for d in _possible_dist_dirs if os.path.exists(d)), None)

    if FRONTEND_DIST:
        assets_dir = os.path.join(FRONTEND_DIST, "assets")
        if os.path.exists(assets_dir):
            app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend_assets")

        @app.get("/{full_path:path}")
        async def serve_spa_frontend(full_path: str):
            if (
                full_path.startswith("api/")
                or full_path.startswith("docs")
                or full_path.startswith("redoc")
                or full_path == "openapi.json"
                or full_path == "health"
            ):
                return None

            file_path = os.path.join(FRONTEND_DIST, full_path)
            if os.path.isfile(file_path):
                return FileResponse(file_path)

            index_file = os.path.join(FRONTEND_DIST, "index.html")
            if os.path.isfile(index_file):
                return FileResponse(index_file)
            return {"error": "Frontend build index.html not found"}

