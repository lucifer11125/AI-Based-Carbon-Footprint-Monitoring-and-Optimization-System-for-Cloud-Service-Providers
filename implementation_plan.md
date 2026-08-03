# Simple Visual Security & Anti-Inspection Plan

A straightforward, visual guide to making CarbonLens AI secure and tamper-proof.

---

## 1. How Our 4-Layer Defense Shield Works

```mermaid
flowchart TD
    subgraph Layer1["🛡️ Layer 1: Browser Protection (Anti-Inspect)"]
        A[User in Browser] -->|Right Click| B[❌ Disabled Context Menu]
        A -->|Presses F12 or Ctrl+Shift+I| C[❌ Blocked Shortcut Keys]
        A -->|Checks Console| D[❌ Logs Cleared & Stripped]
    end

    subgraph Layer2["🔐 Layer 2: API & Network Guard"]
        E[API Request] --> F[Rate Limiter: Max 5 logins/min]
        F --> G[CORS: Only allow your trusted domain]
        G --> H[Security Headers: nosniff, DENY iframe]
    end

    subgraph Layer3["👤 Layer 3: Identity & Role Gatekeeper"]
        H --> I{Active User?}
        I -->|No / Deactivated| J[❌ 403 Forbidden]
        I -->|Yes| K{Matches Company & Role?}
        K -->|No| L[❌ 403 Forbidden]
        K -->|Yes| M[✅ Access Granted]
    end

    subgraph Layer4["🗄️ Layer 4: Database Shield"]
        M --> N[(Supabase PostgreSQL)]
        N -->|Encrypted in Transit| O[SSL Enforced]
        N -->|Multi-Tenant Isolation| P[Filtered by company_id]
    end

    Layer1 -.->|Even if bypassed via curl/proxy| Layer2
```

---

## 2. Why Browser Anti-Inspect + Backend Security Work Together

```mermaid
sequenceDiagram
    autonumber
    actor Attacker as 👤 Attacker (Browser)
    participant UI as 💻 Frontend App
    participant API as 🛡️ Backend Server
    participant DB as 🗄️ Supabase DB

    Note over Attacker,UI: Attempt 1: Browser Inspect
    Attacker->>UI: Right Click / F12 / Inspect
    UI-->>Attacker: 🚫 Blocked (Keys & Menu Intercepted)

    Note over Attacker,API: Attempt 2: Advanced Tool (Postman / curl)
    Attacker->>API: Sends request trying to view another company's data
    API->>API: Checks JWT Role & Company ID
    API-->>Attacker: ⛔ 403 Forbidden (Blocked by Server)
```

---

## 3. Step-by-Step Changes Summary

| Area | What We Are Adding | Why It Protects You |
| :--- | :--- | :--- |
| **Browser Anti-Inspect** | Block Right-Click, `F12`, `Ctrl+Shift+I`, and clear console logs | Stops casual users from inspecting code or tampering with UI |
| **Login Rate Limiter** | Max 5 failed attempts per minute | Stops hackers from brute-forcing passwords with bots |
| **Inactive User Lock** | Check `user.is_active` on every request | Deactivated staff lose access immediately |
| **Strong Passwords** | Require 8+ chars, uppercase, number & symbol | Prevents weak, easily guessable passwords |
| **Strict CORS & Headers** | Whitelist trusted domains + anti-clickjack headers | Stops other websites from hijacking your sessions |
| **Upload Guard** | Max 50MB limit + sanitize CSV formulas | Prevents server crashes and malicious spreadsheet formulas |

---

## 4. Exact File Changes

### Frontend
- **[App.tsx](file:///c:/Users/HARSH/Desktop/sql/carbonlens-ai/frontend/src/App.tsx)**: Add anti-inspect listeners (disable right-click, trap `F12`, disable inspect shortcuts, clean console logs).

### Backend
- **[core/auth.py](file:///c:/Users/HARSH/Desktop/sql/carbonlens-ai/backend/core/auth.py)**: Check `if not user.is_active` on every API call.
- **[schemas/schemas.py](file:///c:/Users/HARSH/Desktop/sql/carbonlens-ai/backend/schemas/schemas.py)**: Add password complexity rules (uppercase + number + min length).
- **[main.py](file:///c:/Users/HARSH/Desktop/sql/carbonlens-ai/backend/main.py)**: Add login rate limiting, tighten CORS, and add security headers (`X-Frame-Options`, `X-Content-Type-Options`).
- **[api/endpoints/datasets.py](file:///c:/Users/HARSH/Desktop/sql/carbonlens-ai/backend/api/endpoints/datasets.py)**: Add 50MB upload limit and CSV formula sanitization.

---

## 5. Verification Plan

- [x] **Anti-Inspect Test**: Right-click and `F12` are blocked in the browser.
- [x] **Rate Limit Test**: 6 rapid failed logins trigger temporary block.
- [x] **Deactivated User Test**: Deactivated account is immediately refused with `403 Forbidden`.
- [x] **Security Headers Test**: Responses include security headers.
