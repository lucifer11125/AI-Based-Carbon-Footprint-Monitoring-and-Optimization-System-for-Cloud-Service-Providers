"""
Turbo Data Migration Script: SQLite -> Supabase PostgreSQL
===========================================================
Uses psycopg2.extras.execute_values for blazing fast bulk inserts.
400,000+ rows migrated in seconds.
"""

import os
import sys
import time
import sqlite3
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

SQLITE_PATH = os.path.join(os.path.dirname(__file__), "carbonlens.db")
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # Direct port 5432 is best for migration
    DATABASE_URL = DATABASE_URL.replace(":6543/", ":5432/")

TABLE_ORDER = [
    "companies",
    "users",
    "datasets",
    "usage_records",
    "processed_metrics",
    "predictions",
    "recommendations",
    "audit_results",
    "reports",
    "simulation_states",
]

BOOLEAN_COLUMNS = {"is_active", "must_reset_password"}


def turbo_migrate():
    print("=" * 60)
    print("  CarbonLens Turbo Migration: SQLite -> Supabase PostgreSQL")
    print("=" * 60)
    print()

    if not os.path.exists(SQLITE_PATH):
        print(f"[ERROR] SQLite DB not found at: {SQLITE_PATH}")
        sys.exit(1)

    if not DATABASE_URL or DATABASE_URL.startswith("sqlite"):
        print("[ERROR] Valid PostgreSQL DATABASE_URL not set in .env")
        sys.exit(1)

    print(f"[1/4] Connecting to Supabase...")
    pg_conn = psycopg2.connect(DATABASE_URL)
    pg_conn.autocommit = False
    pg_cur = pg_conn.cursor()
    print("  [OK] Connected to PostgreSQL")

    # Clear existing rows to ensure clean sync
    print("\n[2/4] Truncating tables for clean state...")
    try:
        tables_csv = ", ".join(TABLE_ORDER)
        pg_cur.execute(f"TRUNCATE TABLE {tables_csv} CASCADE;")
        pg_conn.commit()
        print("  [OK] Tables truncated")
    except Exception as e:
        pg_conn.rollback()
        print(f"  [INFO] Truncate notice: {e}")

    # Read from SQLite & execute_values to PostgreSQL
    print("\n[3/4] Migrating tables at high speed...")
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    overall_start = time.time()

    for table in TABLE_ORDER:
        t_start = time.time()
        try:
            sqlite_cur.execute(f"SELECT * FROM [{table}]")
            rows = sqlite_cur.fetchall()
        except Exception as e:
            print(f"  [SKIP] {table}: {e}")
            continue

        if not rows:
            print(f"  [SKIP] {table}: 0 rows")
            continue

        columns = [desc[0] for desc in sqlite_cur.description]
        col_names = ", ".join(columns)

        # Convert rows to list of tuples with proper types
        data_tuples = []
        for r in rows:
            row_dict = dict(r)
            for b_col in BOOLEAN_COLUMNS:
                if b_col in row_dict and row_dict[b_col] is not None:
                    row_dict[b_col] = bool(row_dict[b_col])
            data_tuples.append(tuple(row_dict[col] for col in columns))

        # Bulk insert with execute_values
        query = f"INSERT INTO {table} ({col_names}) VALUES %s"
        psycopg2.extras.execute_values(
            pg_cur,
            query,
            data_tuples,
            page_size=10000
        )
        pg_conn.commit()
        elapsed = time.time() - t_start
        print(f"  [OK] {table:<22} : {len(data_tuples):>7,} rows in {elapsed:.2f}s ({len(data_tuples)/(elapsed or 0.001):.0f} rows/s)")

    # Reset sequences
    print("\n[4/4] Resetting sequence counters...")
    for table in TABLE_ORDER:
        seq_name = f"{table}_id_seq"
        try:
            pg_cur.execute(f"SELECT COALESCE(MAX(id), 0) FROM {table}")
            max_id = pg_cur.fetchone()[0]
            if max_id > 0:
                pg_cur.execute(f"SELECT setval('{seq_name}', {max_id})")
                print(f"  [OK] {table:<22} sequence -> {max_id}")
        except Exception as e:
            # sequence might not exist
            pg_conn.rollback()

    pg_conn.commit()

    # Verification
    print("\n" + "=" * 60)
    print("  VERIFICATION")
    print("=" * 60)
    print(f"  {'Table':<25} {'SQLite':>10} {'PostgreSQL':>12} {'Match':>8}")
    print("-" * 60)

    all_match = True
    for table in TABLE_ORDER:
        try:
            sqlite_cur.execute(f"SELECT COUNT(*) FROM [{table}]")
            s_count = sqlite_cur.fetchone()[0]
        except Exception:
            s_count = 0

        try:
            pg_cur.execute(f"SELECT COUNT(*) FROM {table}")
            p_count = pg_cur.fetchone()[0]
        except Exception:
            p_count = 0

        match = s_count == p_count
        if not match:
            all_match = False
        print(f"  {table:<25} {s_count:>10,} {p_count:>12,} {'[OK]' if match else '[FAIL]':>8}")

    print("-" * 60)
    total_time = time.time() - overall_start
    print(f"  Total migration completed in {total_time:.2f} seconds!")
    print("=" * 60)

    sqlite_conn.close()
    pg_cur.close()
    pg_conn.close()
    return all_match


if __name__ == "__main__":
    success = turbo_migrate()
    sys.exit(0 if success else 1)
