# CarbonLens AI - Visual Diagrams

This file provides end-to-end visual documentation for the project using Mermaid diagrams.

## 1. Project Map

```mermaid
flowchart TB
  root[carbonlens-ai]

  root --> backend[backend]
  root --> frontend[frontend]
  root --> analytics[analytics-backend]
  root --> testdata[test_data]
  root --> docs[docs and datasets]

  backend --> be_api[api/endpoints]
  backend --> be_core[core]
  backend --> be_models[models]
  backend --> be_schemas[schemas]
  backend --> be_services[services]
  backend --> be_entry[main.py]

  be_api --> be_auth[auth.py]
  be_api --> be_companies[companies.py]
  be_api --> be_datasets[datasets.py]
  be_api --> be_admin[admin.py]
  be_api --> be_reports[reports.py]

  frontend --> fe_src[src]
  fe_src --> fe_pages[pages]
  fe_src --> fe_ctx[context]
  fe_src --> fe_comp[components]
  fe_src --> fe_api[api.js]
  fe_src --> fe_app[App.jsx]

  analytics --> an_entry[main.py]
  analytics --> an_logic[analytics.py]
  analytics --> an_db[database.py]
  analytics --> an_routes[routes_datasets.py]

  docs --> d_readme[README.md]
  docs --> d_project[PROJECT_DOCUMENTATION.md]
  docs --> d_dataset[CSV datasets]
```

## 2. Architecture Overview

```mermaid
flowchart LR
  user[User Browser]

  subgraph FE[Frontend - React + Vite]
    app[App Router and Route Guards]
    authctx[AuthContext]
    apiClient[Axios API Client]
    pages[Dashboard and Feature Pages]
  end

  subgraph BE[Backend - FastAPI]
    main[main.py]
    routers[API Routers]
    auth[JWT Auth and Role Checks]
    services[Metrics, Predictor, Audit, Reco, Simulator]
    orm[SQLAlchemy Models]
  end

  subgraph DB[SQLite]
    tables[(users, companies, datasets, usage_records,\nprocessed_metrics, predictions, recommendations,\naudit_results, reports, simulation_states)]
  end

  user --> app
  app --> pages
  app --> authctx
  pages --> apiClient
  authctx --> apiClient
  apiClient --> routers

  main --> routers
  routers --> auth
  routers --> services
  routers --> orm
  services --> orm
  orm --> tables
```

## 3. Backend Internal Architecture

```mermaid
flowchart TB
  entry[main.py]
  entry --> cors[CORS + Slow Request Middleware]
  entry --> seed[Startup Admin Seeding]
  entry --> mount[Router Registration]

  mount --> r_auth[/api/auth]
  mount --> r_comp[/api/companies]
  mount --> r_data[/api/datasets]
  mount --> r_admin[/api/admin]
  mount --> r_reports[/api/reports]

  r_auth --> core_auth[core/auth.py]
  r_comp --> core_auth
  r_data --> core_auth
  r_admin --> core_auth
  r_reports --> core_auth

  r_data --> svc_metrics[services/metrics_engine.py]
  r_data --> svc_ai[services/ai_predictor.py]
  r_data --> svc_rec[services/recommendations.py]
  r_data --> svc_audit[services/green_audit.py]
  r_data --> svc_sim[services/simulator.py]

  core_auth --> models[models/sql_models.py]
  svc_metrics --> models
  svc_ai --> models
  svc_rec --> models
  svc_audit --> models
  svc_sim --> models
```

## 4. Database ER Diagram

```mermaid
erDiagram
  USERS {
    int id PK
    string email UK
    string hashed_password
    string full_name
    string role
    int company_id FK
    bool is_active
    bool must_reset_password
    int created_by FK
    datetime created_at
  }

  COMPANIES {
    int id PK
    string name UK
    string industry
    string region
    datetime created_at
  }

  DATASETS {
    int id PK
    string name
    int company_id FK
    int uploaded_by FK
    datetime created_at
  }

  USAGE_RECORDS {
    int id PK
    int dataset_id FK
    int month
    int year
    string service
    string region
    float cpu_hours
    float storage_gb
    float network_gb
    float idle_percent
    float monthly_cost
    float region_factor
  }

  PROCESSED_METRICS {
    int id PK
    int dataset_id FK
    int month
    int year
    float total_energy
    float total_carbon
    float carbon_intensity
    float cost_efficiency
    float sustainability_score
  }

  PREDICTIONS {
    int id PK
    int dataset_id FK
    int month_index
    string month_name
    float predicted_carbon
    string trend_direction
    float confidence_score
  }

  RECOMMENDATIONS {
    int id PK
    int dataset_id FK
    string title
    string description
    string priority
    string implementation_effort
    float expected_carbon_reduction
    float expected_cost_savings
  }

  AUDIT_RESULTS {
    int id PK
    int dataset_id FK
    string status
    float overall_score
    string main_issue
    float compute_efficiency
    float storage_utilization
    float network_footprint
    float region_efficiency
    float idle_waste_score
    text recommendations_json
    datetime created_at
  }

  REPORTS {
    int id PK
    int dataset_id FK
    int company_id FK
    string report_type
    string title
    string file_path
    int generated_by FK
    datetime created_at
  }

  SIMULATION_STATES {
    int id PK
    int dataset_id FK
    string scenario_name
    float baseline_carbon
    float simulated_carbon
    float cost_change
    float efficiency_change
    string parameters_json
  }

  COMPANIES ||--o{ USERS : has
  COMPANIES ||--o{ DATASETS : owns
  DATASETS ||--o{ USAGE_RECORDS : contains
  DATASETS ||--o{ PROCESSED_METRICS : aggregates
  DATASETS ||--o{ PREDICTIONS : forecasts
  DATASETS ||--o{ RECOMMENDATIONS : suggests
  DATASETS ||--o{ AUDIT_RESULTS : evaluates
  DATASETS ||--o{ REPORTS : publishes
  DATASETS ||--o{ SIMULATION_STATES : stores
```

## 5. Authentication Workflow

```mermaid
sequenceDiagram
  actor U as User
  participant FE as Frontend (AuthContext)
  participant API as FastAPI Auth Router
  participant AUTH as core/auth.py
  participant DB as SQLite

  U->>FE: Submit email and password
  FE->>API: POST /api/auth/login
  API->>DB: Query users by email
  DB-->>API: User record
  API->>AUTH: verify_password()
  AUTH-->>API: valid or invalid

  alt valid
    API->>AUTH: create_access_token(sub=user.id)
    AUTH-->>API: JWT
    API-->>FE: access_token + user profile
    FE->>FE: Store token in localStorage
    FE->>API: GET /api/auth/me with Bearer token
    API->>AUTH: get_current_user(token)
    API-->>FE: user profile
  else invalid
    API-->>FE: 401 invalid credentials
  end
```

## 6. Dataset Upload and Processing Workflow

```mermaid
sequenceDiagram
  actor U as User/Admin
  participant FE as Frontend Upload Page
  participant API as Datasets Endpoint
  participant DB as SQLite
  participant MET as metrics_engine
  participant AI as ai_predictor
  participant REC as recommendations
  participant AUD as green_audit

  U->>FE: Upload CSV
  FE->>API: POST /api/datasets/upload/{company_id}
  API->>API: Validate role and CSV columns
  API->>DB: Create Dataset row
  API->>DB: Bulk insert UsageRecord rows

  API->>MET: compute_metrics_for_dataset(dataset_id)
  MET->>DB: Write ProcessedMetric rows

  API->>AI: train_and_predict(dataset_id)
  AI->>DB: Write Prediction rows

  API->>REC: generate_recommendations(dataset_id)
  REC->>DB: Write Recommendation rows

  API->>AUD: run_green_audit(dataset_id)
  AUD->>DB: Write AuditResult row

  API-->>FE: DatasetResponse success
```

## 7. Dashboard Data Retrieval Workflow

```mermaid
flowchart TD
  A[Frontend opens Dashboard] --> B[GET /api/datasets/{id}/dashboard]
  B --> C[Validate dataset access]
  C --> D[Load aggregated summary from ProcessedMetric]
  D --> E[Load prediction rows]
  E --> F{Predictions exist?}
  F -- No --> G[Generate predictions on-demand]
  F -- Yes --> H[Reuse existing predictions]
  G --> I[Compose dashboard payload]
  H --> I
  I --> J[Frontend renders KPI cards, trends, region/service charts]
```

## 8. Role-Based Access Control Map

```mermaid
flowchart LR
  role1[csp_admin]
  role2[csp_analyst]
  role3[company_user]

  role1 --> a1[Admin Overview and User Management]
  role1 --> a2[Company Management]
  role1 --> a3[Dataset Upload]
  role1 --> a4[Reports]

  role2 --> b1[Company List]
  role2 --> b2[Audit]
  role2 --> b3[Optimization]
  role2 --> b4[Simulator]
  role2 --> b5[Reports]

  role3 --> c1[Own Company Data]
  role3 --> c2[Dataset Upload]
  role3 --> c3[Audit]
  role3 --> c4[Reports]

  role3 -. denied .-> d1[Simulator]
  role2 -. denied .-> d2[Dataset Upload]
```

## 9. Frontend Routing and Guard Flow

```mermaid
flowchart TD
  R[BrowserRouter] --> P{Protected route?}

  P -- No --> L[/login, /signup]
  P -- Yes --> T{Has user token and /me valid?}

  T -- No --> L
  T -- Yes --> M{must_reset_password?}

  M -- Yes --> RP[/reset-password]
  M -- No --> G[App layout: Sidebar + Header + Outlet]

  G --> D{Route and role check}
  D --> D1[/ -> SmartDashboard]
  D --> D2[/companies -> admin or analyst]
  D --> D3[/users -> admin only]
  D --> D4[/upload -> company_user or admin]
  D --> D5[/audit -> analyst or company_user]
  D --> D6[/optimization -> analyst]
  D --> D7[/simulator -> analyst]
  D --> D8[/reports -> any authenticated user]
```

## 10. Carbon and Metrics Computation Logic

```mermaid
flowchart TB
  I[UsageRecord row] --> E[Energy calculation]
  E --> C[Carbon calculation]
  C --> AGG[Monthly aggregation by year and month]
  AGG --> PM[ProcessedMetric rows]

  subgraph Formulae
    f1[base_energy = cpu_hours*0.003 + storage_gb*0.0001 + network_gb*0.002]
    f2[adjusted_energy = base_energy * 1 + idle_percent/100*0.25]
    f3[carbon = adjusted_energy * 0.40 * region_factor]
  end

  E -. uses .-> f1
  E -. uses .-> f2
  C -. uses .-> f3
```

## 11. Code Dependency Diagram (Backend)

```mermaid
graph LR
  main[main.py] --> routers[api/endpoints/*]
  routers --> auth[core/auth.py]
  routers --> db[core/database.py]
  routers --> schemas[schemas/schemas.py]
  routers --> models[models/sql_models.py]

  data[datasets.py] --> metrics[services/metrics_engine.py]
  data --> predictor[services/ai_predictor.py]
  data --> rec[services/recommendations.py]
  data --> audit[services/green_audit.py]
  data --> sim[services/simulator.py]

  metrics --> models
  predictor --> models
  rec --> models
  audit --> models
  sim --> models
```

## 12. End-to-End Request Lifecycle

```mermaid
flowchart LR
  U[User Action in UI] --> FE[React Page]
  FE --> AX[Axios with JWT Interceptor]
  AX --> EP[FastAPI Endpoint]
  EP --> GUARD[Auth and Role Guard]
  GUARD --> SVC[Domain Service Logic]
  SVC --> ORM[SQLAlchemy]
  ORM --> DB[(SQLite)]
  DB --> ORM
  ORM --> EP
  EP --> AX
  AX --> FE
  FE --> U2[Rendered Charts, Tables, Reports]
```

## 13. Notes

- Diagrams are aligned to the active Python backend in backend, not backend-old.
- The analytics-backend appears as a separate module and can be integrated later via API gateway or internal service calls.
- Mermaid rendering works in VS Code Markdown preview and most Git-hosted Markdown renderers.
