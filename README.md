# CarbonLens AI

Cloud carbon footprint intelligence platform for estimating, analyzing, predicting, and optimizing cloud emissions.

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React 18 + Vite | Single-page app, routing, fast local dev |
| Styling | Custom CSS | Dark dashboard UI and responsive layouts |
| Charts | Recharts | Dashboard and analytics visualizations |
| Animations | Framer Motion | Page and UI transitions |
| Icons | Lucide React | Consistent UI icon set |
| HTTP Client | Axios | API calls, JWT request interceptor, auth error handling |
| Backend | FastAPI + Uvicorn | REST API and generated Swagger docs |
| Database | SQLite + SQLAlchemy | Local persistent data store and ORM models |
| Auth | JWT bearer tokens | Login, protected API access, role-based authorization |
| Data/ML | Pandas + scikit-learn | CSV processing, metrics, predictions, recommendations |

## Features

- Authentication with signup, login, protected routes, password reset, and JWT session handling.
- Role-based access for `csp_admin`, `csp_analyst`, and `company_user`.
- Admin dashboard, company management, and user management.
- Dataset upload and processing for cloud usage data.
- Dashboard summaries for carbon, energy, cost, sustainability, trends, and breakdowns.
- AI predictions, optimization recommendations, green audit, simulator, and reports.

## Project Structure

```text
carbonlens-ai/
|-- backend/
|   |-- main.py                  # FastAPI app, middleware, router registration, admin seeding
|   |-- requirements.txt         # Python dependencies
|   |-- carbonlens.db            # Local SQLite database
|   |-- api/endpoints/           # Auth, companies, datasets, admin, reports routes
|   |-- core/                    # Auth helpers, config, database setup
|   |-- models/sql_models.py     # SQLAlchemy models
|   |-- schemas/schemas.py       # Pydantic request/response schemas
|   `-- services/                # Metrics, prediction, audit, recommendation, simulator logic
|
|-- frontend/
|   |-- .env.example             # Example frontend API base URL config
|   |-- package.json             # Node scripts and dependencies
|   |-- vite.config.js           # Vite configuration
|   `-- src/
|       |-- api.js               # Axios client, JWT interceptor, API groups
|       |-- App.jsx              # React Router routes and role guards
|       |-- context/             # AuthContext and AppContext
|       |-- components/          # Header and Sidebar
|       `-- pages/               # Login, signup, dashboards, upload, reports, etc.
|
|-- test_data/                   # Test datasets
|-- aws_cloud_carbon_dataset.csv # Sample dataset
`-- PROJECT_DOCUMENTATION.md     # Detailed project notes
```

## Getting Started

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --port 8000
```

If using the included virtual environment on Windows:

```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn main:app --port 8000
```

For local development, `--reload` can be used when your Windows environment allows Uvicorn's file-watcher process:

```bash
uvicorn main:app --reload --port 8000
```

Backend URLs:

| Service | URL |
|---|---|
| API | http://localhost:8000 |
| Health check | http://localhost:8000/health |
| Swagger docs | http://localhost:8000/docs |

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL:

| Service | URL |
|---|---|
| Vite app | http://localhost:5173 |

### Frontend API Configuration

The frontend API base URL is configured by `VITE_API_BASE_URL`.

Local development works without an env file because `frontend/src/api.js` falls back to:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

For deployed frontends, set the variable before building:

```env
VITE_API_BASE_URL=https://your-backend.example.com/api
```

See `frontend/.env.example`.

## Authentication

The app uses JWT bearer authentication.

- Public endpoints: `POST /api/auth/login`, `POST /api/auth/register`.
- Login and register return `access_token`, `token_type`, and `user`.
- The frontend stores `carbonlens_token` and `carbonlens_user` in `localStorage`.
- `frontend/src/api.js` attaches `Authorization: Bearer <token>` to API requests.
- Protected request `401` responses clear stale auth state and redirect to `/login`.
- Failed login/register `401` responses stay on the form so inline errors can display.

Default seeded admin account:

```text
Email: admin@carbonlens.ai
Password: admin123
```

## Frontend Routes

| Route | Access |
|---|---|
| `/login` | Public |
| `/signup` | Public |
| `/reset-password` | Authenticated users required to reset password |
| `/` | Authenticated users; admin sees admin dashboard, others see dashboard |
| `/companies` | `csp_admin`, `csp_analyst` |
| `/users` | `csp_admin` |
| `/upload` | `company_user`, `csp_admin` |
| `/audit` | `csp_analyst`, `company_user` |
| `/optimization` | `csp_analyst` |
| `/simulator` | `csp_analyst` |
| `/reports` | Authenticated users |

## Main API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | API health check |
| POST | `/api/auth/register` | Register a company user and return JWT |
| POST | `/api/auth/login` | Login and return JWT |
| GET | `/api/auth/me` | Get current authenticated user |
| POST | `/api/auth/reset-password` | Update current user's password |
| GET | `/api/companies/` | List companies |
| POST | `/api/companies/` | Create company |
| GET | `/api/companies/{company_id}` | Company detail |
| DELETE | `/api/companies/{company_id}` | Delete company |
| POST | `/api/datasets/upload/{company_id}` | Upload usage CSV |
| GET | `/api/datasets/company/{company_id}` | List company datasets |
| GET | `/api/datasets/{dataset_id}/dashboard` | Dashboard summary |
| GET | `/api/datasets/{dataset_id}/predictions` | Prediction results |
| GET | `/api/datasets/{dataset_id}/recommendations` | Optimization recommendations |
| GET | `/api/datasets/{dataset_id}/audit` | Green audit results |
| POST | `/api/datasets/{dataset_id}/simulate` | Run simulation |
| DELETE | `/api/datasets/{dataset_id}` | Delete dataset |
| GET | `/api/admin/overview` | Admin overview |
| GET | `/api/admin/users` | List users |
| POST | `/api/admin/users` | Create user |
| PUT | `/api/admin/users/{user_id}` | Update user |
| DELETE | `/api/admin/users/{user_id}` | Delete user |
| POST | `/api/reports/` | Create report metadata |
| POST | `/api/reports/upload` | Upload report file |
| GET | `/api/reports/` | List accessible reports |
| GET | `/api/reports/company/{company_id}` | List company reports |
| GET | `/api/reports/{report_id}/download` | Download report |
| DELETE | `/api/reports/{report_id}` | Delete report |

## Useful Commands

| Task | Command | Directory |
|---|---|---|
| Start backend | `.\venv\Scripts\python.exe -m uvicorn main:app --port 8000` | `backend/` |
| Start frontend | `npm run dev` | `frontend/` |
| Build frontend | `npm run build` | `frontend/` |
| Check backend auth manually | `.\venv\Scripts\python.exe check_users.py` | `backend/` |

## Notes

- The active backend is `backend/`; `backend-old/` is not used by the current app.
- The frontend API client is centralized in `frontend/src/api.js`.
- The backend seeds the default admin user on startup if no `csp_admin` exists.
- SQLite files are local development artifacts; production should use a managed database.
