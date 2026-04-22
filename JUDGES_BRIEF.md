# CarbonLens AI — Judges Brief

> A concise walkthrough of the entire project, designed for a live explanation to judges.

---

## 1. Problem Statement

Cloud service providers (CSPs) and their client organizations consume massive compute, storage, and network resources — but have **zero visibility** into the resulting carbon emissions. There is no easy, centralized way to:

- **Measure** how much CO₂ cloud workloads generate.
- **Track** emission trends over time.
- **Predict** where emissions are heading.
- **Optimize** infrastructure to reduce environmental impact.

Without this visibility, sustainability commitments remain guesswork.

---

## 2. Our Solution — CarbonLens AI

CarbonLens AI is a **multi-tenant cloud carbon intelligence platform**. Organizations upload their cloud usage data (CSV), and the platform automatically:

1. **Estimates** carbon emissions and energy consumption using physics-based formulas.
2. **Visualizes** metrics on interactive dashboards.
3. **Predicts** future carbon footprint using machine learning.
4. **Audits** infrastructure sustainability with a Green Audit scorecard.
5. **Recommends** concrete optimization strategies.
6. **Simulates** "what-if" scenarios to preview impact of changes before implementation.
7. **Generates** downloadable compliance reports.

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│     React 18 + Vite  │  Recharts  │  Framer Motion          │
│     Axios (JWT Auth) │  React Router v6  │  jsPDF            │
└──────────────────────────┬──────────────────────────────────┘
                           │  REST API (HTTPS + JWT Bearer)
┌──────────────────────────▼──────────────────────────────────┐
│                     BACKEND (Python)                         │
│     FastAPI + Uvicorn                                        │
│     SQLAlchemy ORM  │  Pydantic  │  python-jose (JWT)        │
│     passlib/bcrypt   │  Pandas   │  Scikit-learn              │
└──────────────────────────┬──────────────────────────────────┘
                           │  SQL Queries
┌──────────────────────────▼──────────────────────────────────┐
│                   SQLite DATABASE                             │
│    Users, Companies, Datasets, Usage Records, Metrics,       │
│    Predictions, Recommendations, Audits, Reports             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. How It Works — Data Flow

```
Upload CSV  →  Normalize rows (Pandas)  →  Calculate Energy & Carbon
     →  Store in Database  →  Run ML Predictions  →  Generate Recommendations
     →  Dashboard Visualizes Everything
```

**Carbon Calculation Formula:**

```
Energy (kWh) = (CPU Hours × 0.003) + (Storage GB × 0.0001) + (Network GB × 0.002)
Adjusted Energy = Energy × (1 + idle_percent / 100 × 0.25)
Carbon (kg CO₂e) = Adjusted Energy × 0.40 × Region Factor
```

Each region has a different carbon intensity factor (e.g., US-East = 0.38, EU-West = 0.25, Asia = 0.55) reflecting the actual energy grid mix.

---

## 5. Key Features (What To Demo)

### 5.1 Smart Dashboard
- **KPI Cards:** Total Carbon (CO₂e), Energy (kWh), Cost ($), Sustainability Score — each with month-over-month trend arrows.
- **Charts:** Monthly carbon/energy trends (line chart), top carbon-emitting regions (bar chart), service-wise breakdown.

### 5.2 AI Forecasting
- Uses **Scikit-learn Linear Regression** trained on historical monthly carbon data.
- Predicts the **next 3 months** of emissions.
- Shows **trend direction** (Increasing / Stable / Decreasing) and **confidence score** for each prediction.
- Confidence improves with more historical data points: `conf = min(0.95, 0.5 + months × 0.03)`.

### 5.3 Green Audit (ESG Compliance)
Produces a sustainability scorecard by analyzing all usage records:

| Audit Category | What It Checks |
|---|---|
| Compute Efficiency | CPU utilization vs. idle waste |
| Storage Utilization | Consistency of storage usage |
| Network Footprint | Data transfer overhead |
| Region Efficiency | Whether workloads run in low-carbon regions |
| Idle Waste Score | Percentage of records with excessive idle time |

**Weighted Overall Score:** Compute (25%) + Storage (20%) + Network (15%) + Region (25%) + Idle (15%)

Risk levels: **Low** (≥75), **Moderate** (50–74), **High** (<50)

Generates **prioritized recommendations** with estimated carbon reduction impact.

### 5.4 Optimization Recommendations
Context-aware suggestions generated from actual usage patterns:
- Shut down idle resources (if avg idle > 10%)
- Right-size CPU allocations (if avg CPU > 500 hours)
- Migrate to low-carbon regions (if > 30% workloads in high-carbon regions)
- Implement storage tiering (if avg storage > 3000 GB)
- Adopt serverless & container orchestration
- Carbon-aware job scheduling

Each recommendation includes **expected carbon reduction (kg CO₂e)** and **expected cost savings ($)**.

### 5.5 What-If Simulator
Users adjust 5 sliders and instantly see the carbon/cost impact:

| Parameter | What It Simulates |
|---|---|
| CPU Reduction % | Downsizing or consolidating compute |
| Storage Optimization % | Tiering and lifecycle policies |
| Idle Reduction % | Auto-shutdown of idle resources |
| Region Shift Factor | Moving workloads to greener regions |
| Renewable Energy % | Offsetting with renewable energy sources |

Output: **Baseline vs. Simulated** carbon and cost, with percentage change.

### 5.6 Report Engine
- Create, upload, and download compliance reports.
- Client-side PDF generation using jsPDF.
- Reports are scoped by company — users can only see their own.

---

## 6. Security & Multi-Tenancy

### Authentication
- **JWT Bearer Tokens** — issued on login, attached to every API request.
- **Passwords** hashed with bcrypt (passlib).
- Sessions restored on page load via `/api/auth/me`.
- 401 responses auto-clear stale tokens and redirect to login.

### Role-Based Access Control (RBAC)

| Role | Who They Are | What They Can Do |
|---|---|---|
| **CSP Admin** | Platform administrator | Manage companies, create/edit/delete users, view platform overview |
| **CSP Analyst** | Data analyst at the CSP | Access all companies, run audits, optimization, simulations, publish reports |
| **Company User** | Client organization user | Upload datasets, view own company dashboard/audit/reports only |

### Data Isolation
- All queries filter by `company_id` — a Company User can never see another company's data.
- Dataset child records (metrics, predictions, audits) cascade on deletion.

---

## 7. Tech Stack Summary

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 5, Recharts, Framer Motion, Lucide React, Axios, React Router v6, jsPDF |
| **Backend** | Python, FastAPI, Uvicorn, SQLAlchemy, Pydantic |
| **Auth** | JWT (python-jose), passlib + bcrypt |
| **AI/ML** | Pandas, NumPy, Scikit-learn (Linear Regression) |
| **Database** | SQLite (development), SQLAlchemy ORM |
| **Deployment** | Docker, Docker Compose |

---

## 8. Database Schema (10 Tables)

| Table | Purpose |
|---|---|
| `users` | Auth accounts, roles, company association |
| `companies` | Tenant/organization records |
| `datasets` | Uploaded dataset metadata |
| `usage_records` | Normalized rows from CSV uploads |
| `processed_metrics` | Monthly energy, carbon, cost, sustainability |
| `predictions` | AI-forecasted future carbon values |
| `recommendations` | Optimization suggestions |
| `audit_results` | Green Audit scores and findings |
| `reports` | Report metadata and files |
| `simulation_states` | Stored simulation scenarios |

---

## 9. What Makes This Project Unique

1. **End-to-End Pipeline** — From raw CSV upload to AI predictions and actionable recommendations, fully automated.
2. **Real Calculations, Not Mock Data** — Carbon emissions are computed from physics-based energy models with region-specific carbon intensity factors.
3. **Multi-Tenant SaaS Architecture** — Strict data isolation between companies, role-based access, JWT security.
4. **What-If Simulator** — Users can preview the impact of infrastructure changes before making them — a decision-support tool, not just a dashboard.
5. **Green Audit Scorecard** — A unique ESG compliance feature that scores infrastructure sustainability across 5 dimensions.

---

## 10. AI & ML Models Used

### 10.1 Linear Regression — Carbon Forecasting
- **Library:** Scikit-learn (`LinearRegression`)
- **Training Data:** Monthly `ProcessedMetric` records (historical carbon values for a dataset)
- **Feature (X):** Sequential time index (month number)
- **Target (y):** `total_carbon` per month
- **Output:** Predicted carbon for the next 3 months, each with a trend direction (Increasing / Stable / Decreasing) and a confidence score
- **Trend Logic:** If the predicted value differs from the last actual value by more than 5%, the trend is flagged as Increasing or Decreasing; otherwise Stable
- **Confidence Formula:** `min(0.95, 0.5 + num_months × 0.03)` — improves as more historical data is available

### 10.2 Physics-Based Energy & Carbon Model
A domain-specific computational model (not a trained ML model) that estimates emissions from raw usage data:

```
Energy (kWh) = (CPU Hours × 0.003) + (Storage GB × 0.0001) + (Network GB × 0.002)
Adjusted Energy = Energy × (1 + idle_percent / 100 × 0.25)
Carbon (kg CO₂e) = Adjusted Energy × 0.40 × Region Factor
```

Region emission factors are based on real-world grid carbon intensity (e.g., Stockholm = 0.01 due to renewables, Mumbai = 0.70 due to coal).

### 10.3 Weighted Multi-Criteria Scoring — Green Audit
A scoring algorithm that evaluates 5 sustainability dimensions using SQL aggregates and combines them with fixed weights:

```
Overall = Compute(25%) + Storage(20%) + Network(15%) + Region(25%) + Idle Waste(15%)
```

A rule engine then triggers recommendations based on threshold breaches.

### 10.4 Parametric Simulation Model — What-If Simulator
Breaks carbon into 4 portions (CPU 40%, Storage 25%, Network 20%, Idle 15%) and applies user-defined reduction percentages, region shifts, and renewable energy offsets to produce a simulated carbon/cost outcome.

### 10.5 Context-Aware Recommendation Engine
A conditional rule engine that queries aggregate usage statistics and generates quantified recommendations only when specific thresholds are exceeded (e.g., avg idle > 10%, avg CPU > 500 hours, >30% workloads in high-carbon regions). Each recommendation includes calculated expected carbon reduction and cost savings.

---

## 11. MVC Architecture

The project follows a modified MVC pattern with a decoupled View layer (React frontend communicating with a FastAPI backend via REST API).

### Model — Data & Business Logic
**Location:** `backend/models/`, `backend/schemas/`, `backend/services/`, `backend/core/`

| Component | Files | Responsibility |
|---|---|---|
| Database Models | `models/sql_models.py` | 10 SQLAlchemy ORM classes (User, Company, Dataset, UsageRecord, ProcessedMetric, Prediction, Recommendation, AuditResult, Report, SimulationState) |
| Schemas | `schemas/schemas.py` | Pydantic validation and serialization for all request/response data |
| Database Engine | `core/database.py` | SQLAlchemy engine, session lifecycle |
| Metrics Engine | `services/metrics_engine.py` | Carbon and energy computation formulas |
| AI Predictor | `services/ai_predictor.py` | ML model training and carbon forecasting |
| Green Audit | `services/green_audit.py` | Sustainability scoring algorithm |
| Recommendations | `services/recommendations.py` | Context-aware recommendation generation |
| Simulator | `services/simulator.py` | What-if parametric simulation |

### Controller — Request Handling & Routing
**Location:** `backend/api/endpoints/`, `backend/main.py`

| Component | Files | Responsibility |
|---|---|---|
| Auth Controller | `api/endpoints/auth.py` | Login, register, password reset |
| Dataset Controller | `api/endpoints/datasets.py` | Upload, dashboard, predictions, audit, simulation endpoints |
| Company Controller | `api/endpoints/companies.py` | Company CRUD |
| Admin Controller | `api/endpoints/admin.py` | Platform overview, user management |
| Report Controller | `api/endpoints/reports.py` | Report create, upload, download |
| App Entry | `main.py` | Router registration, CORS, admin seeding |

Controllers never contain business logic — they validate requests, check authorization, delegate to Model services, and return responses.

### View — User Interface & Presentation
**Location:** `frontend/src/pages/`, `frontend/src/components/`, `frontend/src/context/`

| Component | Files | Responsibility |
|---|---|---|
| Pages | `pages/*.jsx` | Dashboard, Audit, Optimization, Simulator, Upload, Reports, Login, Signup |
| Layout | `components/Header.jsx`, `Sidebar.jsx` | App shell with navigation |
| State Management | `context/AuthContext.jsx`, `AppContext.jsx` | Auth state and shared app state |
| API Client | `api.js` | Axios instance connecting View to Controller |

### MVC Request Flow

```
User Action (Browser)
    │
    ▼
 VIEW — React Page sends request via Axios (api.js)
    │
    ▼  REST API call (POST/GET with JWT)
 CONTROLLER — FastAPI endpoint validates auth, parses input
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

---

## 12. Future Scope

- **Multi-Cloud Support** — Extend to AWS, Azure, GCP native APIs for automatic data ingestion.
- **Intelligent Alerts** — Push notifications for anomalies (e.g., "Idle compute increased 18% this month").
- **AI Chat Assistant** — Natural language queries embedded in the dashboard ("What is my top carbon-emitting region?").
- **Organization Hierarchy** — Umbrella organizations managing multiple companies/projects.

---

## Quick Demo Credentials

```
Email:    admin@carbonlens.ai
Password: admin123
Role:     CSP Admin (full platform access)
```

**Frontend:** http://localhost:5173
**Backend API:** http://localhost:8000
**Swagger Docs:** http://localhost:8000/docs
