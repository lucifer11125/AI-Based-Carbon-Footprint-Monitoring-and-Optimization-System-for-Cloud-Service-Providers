import requests
import json

BASE = "http://localhost:8000/api"

# Login
r = requests.post(f"{BASE}/auth/login", json={"email": "admin@carbonlens.ai", "password": "admin123"})
assert r.status_code == 200, f"Login failed: {r.text}"
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("[OK] Logged in")

# Upload CSV
with open(r"c:\Users\HARSH\Desktop\carbonlens-ai\sample_data.csv", "rb") as f:
    r2 = requests.post(f"{BASE}/datasets/upload/1", files={"file": ("sample_data.csv", f, "text/csv")}, headers=headers)
if r2.status_code == 200:
    ds = r2.json()
    print(f"[OK] Uploaded dataset: {ds['name']} (ID: {ds['id']})")
else:
    print(f"[FAIL] Upload: {r2.status_code} - {r2.text[:200]}")
    exit(1)

dataset_id = ds["id"]

# Test Dashboard
r3 = requests.get(f"{BASE}/datasets/{dataset_id}/dashboard", headers=headers)
if r3.status_code == 200:
    d = r3.json()
    print(f"[OK] Dashboard: Carbon={d['total_carbon']:.2f}, Energy={d['total_energy']:.2f}, Cost=${d['total_cost']:.0f}, Score={d['sustainability_score']:.1f}")
else:
    print(f"[FAIL] Dashboard: {r3.text[:200]}")

# Test Predictions
r4 = requests.get(f"{BASE}/datasets/{dataset_id}/predictions", headers=headers)
if r4.status_code == 200:
    preds = r4.json()
    for p in preds:
        print(f"  Prediction: {p['month_name']} → {p['predicted_carbon']:.2f} tCO2e ({p['trend_direction']})")
else:
    print(f"[FAIL] Predictions: {r4.text[:200]}")

# Test Audit
r5 = requests.get(f"{BASE}/datasets/{dataset_id}/audit", headers=headers)
if r5.status_code == 200:
    a = r5.json()
    print(f"[OK] Audit: Status={a['status']}, Score={a['overall_score']}")
else:
    print(f"[FAIL] Audit: {r5.text[:200]}")

# Test Recommendations
r6 = requests.get(f"{BASE}/datasets/{dataset_id}/recommendations", headers=headers)
if r6.status_code == 200:
    recs = r6.json()
    print(f"[OK] Recommendations: {len(recs)} items")
    for rec in recs[:3]:
        print(f"  [{rec['priority']}] {rec['title']}")
else:
    print(f"[FAIL] Recs: {r6.text[:200]}")

# Test Simulator
r7 = requests.post(f"{BASE}/datasets/{dataset_id}/simulate", json={
    "cpu_reduction_percent": 20,
    "storage_optimization_percent": 10,
    "region_shift_factor": 0.3,
    "idle_reduction_percent": 30,
    "renewable_energy_percent": 50
}, headers=headers)
if r7.status_code == 200:
    s = r7.json()
    print(f"[OK] Simulator: Baseline={s['baseline_carbon']:.4f} → Simulated={s['simulated_carbon']:.4f} ({s['carbon_change_percent']:.1f}%)")
else:
    print(f"[FAIL] Simulator: {r7.text[:200]}")

print("\nAll tests complete!")
