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
