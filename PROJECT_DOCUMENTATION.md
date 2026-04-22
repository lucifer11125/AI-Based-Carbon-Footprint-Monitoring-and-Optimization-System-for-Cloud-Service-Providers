# CarbonLens AI - Project Documentation

## 1. Overview

CarbonLens AI is a multi-tenant cloud carbon intelligence platform. It lets organizations upload cloud usage data, estimate emissions, inspect trends, forecast future impact, run what-if simulations, and generate reports.

The current app is a React + Vite frontend connected to a FastAPI backend. Authentication is handled with JWT bearer tokens and role-based route/API access.

## 2. Current Architecture

### Frontend

The frontend lives in `frontend/src`.

| Area | Files | Responsibility |
|---|---|---|
| API client | `api.js` | Axios instance, API base URL, JWT header injection, 401 handling |
| Routing | `App.jsx` | Public routes, protected layout, role guards |
| Auth state | `context/AuthContext.jsx` | Login, register, logout, session restore, current user |
| App state | `context/AppContext.jsx` | Shared dashboard/company/dataset state |
| Layout | `components/Header.jsx`, `components/Sidebar.jsx` | Authenticated app shell |
| Pages | `pages/*.jsx` | Login, signup, dashboards, upload, audit, optimization, simulator, reports, user management |

### Backend

The backend lives in `backend`.

| Area | Files | Responsibility |
|---|---|---|
| App entry | `main.py` | FastAPI app, CORS, router registration, default admin seeding |
| Auth | `core/auth.py`, `api/endpoints/auth.py` | Password hashing, JWT creation/validation, current-user dependency |
| Database | `core/database.py` | SQLite SQLAlchemy engine and session lifecycle |
| Models | `models/sql_models.py` | Users, companies, datasets, usage records, metrics, predictions, audits, reports |
| Schemas | `schemas/schemas.py` | Pydantic request and response models |
| Endpoints | `api/endpoints/*.py` | REST API handlers |
| Services | `services/*.py` | Metrics engine, predictions, audit, recommendations, simulator |

## 3. Authentication and Authorization

The app uses JSON login requests and JWT bearer tokens.

### Login Contract

Request:

```json
{
  "email": "admin@carbonlens.ai",
  "password": "admin123"
}
```

Response:

```json
{
  "access_token": "...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "admin@carbonlens.ai",
    "full_name": "Platform Admin",
    "role": "csp_admin",
    "company_id": null,
    "company_name": null,
    "is_active": true,
    "must_reset_password": false,
    "created_by": null,
    "created_at": "..."
  }
}
```

### Frontend Auth Flow

1. `AuthContext.login()` posts credentials to `/api/auth/login`.
2. On success, it stores:
   - `carbonlens_token`
   - `carbonlens_user`
3. `api.js` attaches `Authorization: Bearer <token>` to requests.
4. On app load, `AuthContext` calls `/api/auth/me` when a token exists.
5. Protected request `401` responses clear stale auth state and redirect to `/login`.
6. Login/register `401` responses do not redirect, so the form can show inline errors.

### Roles

| Role | Purpose |
|---|---|
| `csp_admin` | Platform administrator with company and user management access |
| `csp_analyst` | Analyst user with company, audit, optimization, and simulation access |
| `company_user` | Company-scoped user with own company data access |

Default seeded admin:

```text
Email: admin@carbonlens.ai
Password: admin123
```

## 4. Configuration

### Backend

Backend configuration is loaded from `backend/.env` through `python-dotenv`.

Common variables:

```env
SECRET_KEY=change-me
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

The local database is SQLite at:

```text
backend/carbonlens.db
```

### Frontend

The frontend API base URL is controlled by `VITE_API_BASE_URL`.

Local default:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Deployment example:

```env
VITE_API_BASE_URL=https://your-backend.example.com/api
```

The frontend normalizes trailing slashes, so both of these are accepted:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_API_BASE_URL=http://localhost:8000/api/
```

## 5. How to Run

### Backend

```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn main:app --port 8000
```

Use `--reload` only if the local Windows environment allows the Uvicorn file watcher:

```powershell
.\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

Backend URLs:

| Service | URL |
|---|---|
| API | http://localhost:8000 |
| Health | http://localhost:8000/health |
| Swagger | http://localhost:8000/docs |

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## 6. Frontend Routes

| Route | Page | Access |
|---|---|---|
| `/login` | Login | Public |
| `/signup` | Signup | Public |
| `/reset-password` | Reset password | Authenticated user required to reset password |
| `/` | Smart dashboard | Authenticated |
| `/companies` | Companies | `csp_admin`, `csp_analyst` |
| `/users` | User management | `csp_admin` |
| `/upload` | Dataset upload | `company_user`, `csp_admin` |
| `/audit` | Green audit | `csp_analyst`, `company_user` |
| `/optimization` | Optimization | `csp_analyst` |
| `/simulator` | Simulator | `csp_analyst` |
| `/reports` | Reports | Authenticated |

## 7. API Endpoints

All protected endpoints require:

```http
Authorization: Bearer <token>
```

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register company user |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/auth/me` | Current user profile |
| POST | `/api/auth/reset-password` | Reset current user's password |

### Companies

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/companies/` | List accessible companies |
| POST | `/api/companies/` | Create company |
| GET | `/api/companies/{company_id}` | Company detail and metrics |
| DELETE | `/api/companies/{company_id}` | Delete company |

### Datasets

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/datasets/upload/{company_id}` | Upload usage CSV |
| GET | `/api/datasets/company/{company_id}` | List company datasets |
| GET | `/api/datasets/{dataset_id}/dashboard` | Dataset dashboard summary |
| GET | `/api/datasets/{dataset_id}/predictions` | Forecast data |
| GET | `/api/datasets/{dataset_id}/recommendations` | Optimization recommendations |
| GET | `/api/datasets/{dataset_id}/audit` | Green audit |
| POST | `/api/datasets/{dataset_id}/simulate` | What-if simulation |
| DELETE | `/api/datasets/{dataset_id}` | Delete dataset |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/overview` | Platform overview |
| GET | `/api/admin/users` | List users |
| POST | `/api/admin/users` | Create user |
| PUT | `/api/admin/users/{user_id}` | Update user |
| DELETE | `/api/admin/users/{user_id}` | Delete user |

### Reports

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/reports/` | Create report record |
| POST | `/api/reports/upload` | Upload report file |
| GET | `/api/reports/` | List accessible reports |
| GET | `/api/reports/company/{company_id}` | List company reports |
| GET | `/api/reports/{report_id}/download` | Download report |
| DELETE | `/api/reports/{report_id}` | Delete report |

## 8. Data Model

The main tables are:

| Table | Purpose |
|---|---|
| `users` | Auth accounts, roles, active status, company association |
| `companies` | Tenant/company records |
| `datasets` | Uploaded dataset metadata |
| `usage_records` | Normalized rows from uploaded cloud usage CSV files |
| `processed_metrics` | Monthly energy, carbon, cost efficiency, sustainability metrics |
| `predictions` | Forecast output for future carbon values |
| `recommendations` | Optimization recommendations for a dataset |
| `audit_results` | Green audit scoring and recommendations |
| `reports` | Generated or uploaded report metadata |
| `simulation_states` | Stored simulation scenarios |

Important relationships:

- A company has many users and datasets.
- A dataset has many usage records, metrics, predictions, recommendations, audits, and reports.
- Dataset child records cascade on dataset deletion.

## 9. Data Processing Flow

1. User uploads a CSV through `/api/datasets/upload/{company_id}`.
2. Backend reads the CSV with Pandas.
3. Usage rows are normalized and stored as `UsageRecord` records.
4. Metrics are calculated by `services/metrics_engine.py`.
5. Predictions are generated by `services/ai_predictor.py`.
6. Recommendations are generated by `services/recommendations.py`.
7. Audit and simulator pages read processed backend outputs through protected endpoints.

## 10. Carbon Calculation

The core calculation combines CPU, storage, network, idle overhead, and regional emissions factors.

```text
Total Energy (kWh) =
  (CPU Hours * cpu factor)
  + (Storage GB * storage factor)
  + (Network GB * network factor)

Adjusted Energy =
  Total Energy * idle overhead

Carbon =
  Adjusted Energy * regional carbon intensity
```

Region factors are defined in `backend/core/config.py`.

## 11. Recent Project Changes

- Frontend API base URL is now environment-driven through `VITE_API_BASE_URL`.
- `frontend/.env.example` documents the local API default.
- Login and register failures no longer trigger global auth redirects.
- Protected `401` responses still clear stale local auth state and redirect to `/login`.
- Plaintext password/debug logging was removed from frontend login and backend auth.
- Documentation now reflects the active `backend/` and `frontend/src` structure.

## 12. Operational Notes

- The active backend is `backend/`; `backend-old/` is historical.
- On some Windows setups, `uvicorn --reload` may be blocked by process permissions. Use `uvicorn main:app --port 8000` when that happens.
- For production, replace the development SQLite setup with a managed database and set a strong `SECRET_KEY`.
- Do not commit real production secrets into `.env` files.

## 13. Green Audit

The Green Audit is an ESG (Environmental, Social, Governance) compliance assessment that evaluates how sustainably a company's cloud infrastructure is being used. It analyzes a dataset's usage records and produces a sustainability scorecard with actionable recommendations.

### What It Calculates

The audit engine (`services/green_audit.py`) queries all `UsageRecord` rows for a dataset using SQL aggregates and computes five efficiency scores (each 0–100%):

| Score | What It Measures | How It Is Calculated |
|---|---|---|
| Compute Efficiency | How well CPU is utilized vs. idle | `100 - avg_idle × 1.5` |
| Storage Utilization | Consistency of storage usage | `(avg_storage / max_storage) × 100` |
| Network Footprint | Network data transfer overhead | `100 - (avg_network / avg_cpu) × 5` |
| Region Efficiency | Whether workloads run in low-carbon regions | `(1 - avg_region_factor) × 150` |
| Idle Waste Score | Percentage of records with high idle time (>20%) | `100 - (high_idle_count / total × 100)` |

These are combined into a weighted overall score:

```text
Overall = Compute(25%) + Storage(20%) + Network(15%) + Region(25%) + Idle Waste(15%)
```

The overall score determines the risk level:

| Score Range | Risk Level |
|---|---|
| ≥ 75 | Low Risk |
| 50–74 | Moderate Risk |
| < 50 | High Risk |

### What It Shows on the UI

The Green Audit page (`pages/GreenAuditPage.jsx`) displays three sections:

1. **Overall Score Banner** — A large circular score with the risk status (Low, Moderate, or High) and the main issue identified.
2. **Five Category Cards** — Each category shows a percentage score and an animated progress bar for Compute Efficiency, Storage Utilization, Network Footprint, Region Efficiency, and Idle Waste Score.
3. **Audit Recommendations** — Prioritized action items (High, Medium, or Low priority) with estimated carbon reduction impact. Examples include:
   - Optimize Compute Resources — right-size instances when idle rate is high.
   - Migrate to Low-Carbon Regions — move workloads to cleaner energy grids.
   - Implement Auto-Shutdown Policies — schedule shutdowns during non-peak hours.
   - Implement Storage Tiering — move infrequently accessed data to cold storage tiers.
   - Optimize Network Transfer — implement CDN and compression for high transfer rates.
   - Enable Carbon-Aware Scheduling — run batch jobs during low-carbon grid periods.

### Access

The Green Audit page is available at `/audit` for `csp_analyst` and `company_user` roles.

## 14. AI & ML Models

### Linear Regression — Carbon Forecasting

The AI predictor (`services/ai_predictor.py`) uses Scikit-learn `LinearRegression` to forecast carbon emissions.

- **Training Data:** Monthly `ProcessedMetric` records for a dataset.
- **Feature (X):** Sequential time index (month number).
- **Target (y):** `total_carbon` per month.
- **Output:** Predicted carbon for the next 3 months, each with:
  - Trend direction: Increasing (>5% rise), Decreasing (>5% drop), or Stable.
  - Confidence score: `min(0.95, 0.5 + num_months × 0.03)`.

### Physics-Based Energy & Carbon Model

The metrics engine (`services/metrics_engine.py`) computes emissions from raw usage data using physics-based formulas:

```text
Energy (kWh) = (CPU Hours × 0.003) + (Storage GB × 0.0001) + (Network GB × 0.002)
Adjusted Energy = Energy × (1 + idle_percent / 100 × 0.25)
Carbon (kg CO₂e) = Adjusted Energy × 0.40 × Region Factor
```

Region emission factors are defined in `core/config.py` and represent real-world grid carbon intensity values (e.g., `eu-north-1` Stockholm = 0.01 due to renewables, `ap-south-1` Mumbai = 0.70 due to coal).

A sustainability score is also computed per month:

```text
Sustainability = (idle_score × 0.3) + (region_score × 0.4) + (50 × 0.3)
```

### Weighted Multi-Criteria Scoring — Green Audit

The green audit service (`services/green_audit.py`) evaluates 5 sustainability dimensions using SQL aggregates and combines them with fixed weights:

```text
Overall = Compute(25%) + Storage(20%) + Network(15%) + Region(25%) + Idle Waste(15%)
```

A rule engine triggers specific recommendations when category scores fall below defined thresholds.

### Parametric Simulation Model — What-If Simulator

The simulator (`services/simulator.py`) breaks carbon into 4 portions (CPU 40%, Storage 25%, Network 20%, Idle 15%) and applies user-defined reductions, region shifts, and renewable energy offsets:

```text
Simulated = (new_cpu + new_storage + network + new_idle) × region_ratio × renewable_offset
```

### Context-Aware Recommendation Engine

The recommendations service (`services/recommendations.py`) queries aggregate usage statistics and generates quantified recommendations only when specific thresholds are exceeded:

| Condition | Recommendation |
|---|---|
| avg idle > 10% | Shut down idle resources |
| avg CPU > 500 hours | Right-size CPU allocations |
| >30% high-carbon regions | Migrate to low-carbon regions |
| avg storage > 3000 GB | Implement storage tiering |
| avg network > 5000 GB | Optimize network transfer |
| avg cost > $10,000 | Purchase reserved capacity |

Each recommendation includes calculated expected carbon reduction (kg CO₂e) and cost savings ($).

## 15. MVC Architecture

The project follows a modified MVC pattern with a decoupled View layer. The React frontend communicates with the FastAPI backend via REST API.

### Model — Data & Business Logic

Location: `backend/models/`, `backend/schemas/`, `backend/services/`, `backend/core/`

| Component | Files | Responsibility |
|---|---|---|
| Database Models | `models/sql_models.py` | 10 SQLAlchemy ORM classes defining the database schema |
| Schemas | `schemas/schemas.py` | Pydantic validation and serialization for request/response data |
| Database Engine | `core/database.py` | SQLAlchemy engine, session lifecycle |
| Metrics Engine | `services/metrics_engine.py` | Carbon and energy computation |
| AI Predictor | `services/ai_predictor.py` | ML model training and forecasting |
| Green Audit | `services/green_audit.py` | Sustainability scoring algorithm |
| Recommendations | `services/recommendations.py` | Context-aware recommendation generation |
| Simulator | `services/simulator.py` | What-if parametric simulation |

### Controller — Request Handling & Routing

Location: `backend/api/endpoints/`, `backend/main.py`

| Component | Files | Responsibility |
|---|---|---|
| Auth Controller | `api/endpoints/auth.py` | Login, register, password reset |
| Dataset Controller | `api/endpoints/datasets.py` | Upload, dashboard, predictions, audit, simulation |
| Company Controller | `api/endpoints/companies.py` | Company CRUD |
| Admin Controller | `api/endpoints/admin.py` | Platform overview, user management |
| Report Controller | `api/endpoints/reports.py` | Report create, upload, download |
| App Entry | `main.py` | Router registration, CORS, admin seeding |

Controllers do not contain business logic. They validate requests, check authorization, delegate to Model services, and return responses.

### View — User Interface & Presentation

Location: `frontend/src/pages/`, `frontend/src/components/`, `frontend/src/context/`

| Component | Files | Responsibility |
|---|---|---|
| Pages | `pages/*.jsx` | Dashboard, Audit, Optimization, Simulator, Upload, Reports, Login, Signup |
| Layout | `components/Header.jsx`, `Sidebar.jsx` | App shell with navigation |
| State Management | `context/AuthContext.jsx`, `AppContext.jsx` | Auth state and shared app state |
| API Client | `api.js` | Axios instance connecting View to Controller |

### MVC Request Flow

```text
User Action (Browser)
    │
    ▼
 VIEW — React Page sends request via Axios (api.js)
    │
    ▼  REST API call (POST/GET with JWT)
 CONTROLLER — FastAPI endpoint validates auth & parses input
    │
    ▼  Delegates to service
 MODEL — Service runs business logic (metrics/ML/audit/simulation)
    │
    ▼  Reads/writes database via SQLAlchemy ORM
 CONTROLLER — Returns JSON response
    │
    ▼
 VIEW — React Page renders charts, cards, tables
```
