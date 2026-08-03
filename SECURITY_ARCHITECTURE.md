# CarbonLens AI — Visual Security & Anti-Inspection Guide

A clear, visual explanation of how CarbonLens AI protects its data and prevents unauthorized inspection and tampering.

---

## 1. The 4-Layer Defense Architecture

```mermaid
flowchart TD
    subgraph L1["🛡️ 1. Browser Shield (Anti-Inspect)"]
        U[Browser User] -->|Right Click| NC[❌ Context Menu Disabled]
        U -->|F12 / Ctrl+Shift+I| NS[❌ Shortcuts Intercepted]
        U -->|Console| CL[❌ Logs Cleared & Suppressed]
    end

    subgraph L2["🔐 2. API & Network Shield"]
        REQ[Incoming API Request] --> RL[Rate Limiter: Max 5 logins/min]
        RL --> CORS[CORS: Whitelisted Domains Only]
        CORS --> HD[Security Headers: nosniff, DENY iframe]
    end

    subgraph L3["👤 3. Role & Identity Shield"]
        HD --> ACT{User Active?}
        ACT -->|No| F1[❌ 403 Account Deactivated]
        ACT -->|Yes| ROL{Role & Company Match?}
        ROL -->|No| F2[❌ 403 Access Denied]
        ROL -->|Yes| OK[✅ Action Authorized]
    end

    subgraph L4["🗄️ 4. Supabase Database Shield"]
        OK --> DB[(PostgreSQL Database)]
        DB --> SSL[Enforced SSL Encryption]
        DB --> MT[Strict company_id Isolation]
    end

    L1 -.->|Even if bypassed via curl or Postman| L2
```

---

## 2. Attack vs Defense Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Attacker as 👤 Attacker
    participant Browser as 💻 Frontend App
    participant Backend as 🛡️ FastAPI Backend
    participant DB as 🗄️ Supabase PostgreSQL

    Note over Attacker,Browser: Scenario 1: Attacker tries to Inspect in Browser
    Attacker->>Browser: Right-click or F12
    Browser-->>Attacker: 🚫 Blocked (Key listener prevents DevTools)

    Note over Attacker,Backend: Scenario 2: Attacker tries to Brute-Force Login
    Attacker->>Backend: 6 rapid incorrect password attempts
    Backend-->>Attacker: ⛔ 429 Too Many Requests (Rate limit triggered)

    Note over Attacker,Backend: Scenario 3: Attacker tries to view another Company's Dataset
    Attacker->>Backend: GET /api/datasets/1 (Company B data with Company A Token)
    Backend->>Backend: Validates JWT company_id != dataset.company_id
    Backend-->>Attacker: ⛔ 403 Forbidden (Strict Multi-Tenant Isolation)
```

---

## 3. Summary of Security Controls

| Protection Layer | What It Does | Threat Stopped |
| :--- | :--- | :--- |
| **Anti-Inspect & Anti-Tamper** | Disables right-click, `F12`, `Ctrl+Shift+I`, `Ctrl+U`, and strips console logs | Casual inspection, code copying, and client script tampering |
| **Login Rate Limiting** | Limits failed logins to 5 per minute per IP | Automated password guessing and credential stuffing |
| **Active User Verification** | Checks `user.is_active` on every API call | Revoked/deactivated users using old tokens |
| **Password Complexity** | Enforces minimum 8 characters, uppercase, and numbers | Weak, easily cracked user passwords |
| **CORS & HTTP Headers** | Whitelists frontend origin + anti-iframe headers | Cross-site request hijacking and clickjacking |
| **File Upload Ceiling** | Limits dataset uploads to 50MB and cleans formula prefixes | Memory exhaustion DoS and spreadsheet formula injection |
