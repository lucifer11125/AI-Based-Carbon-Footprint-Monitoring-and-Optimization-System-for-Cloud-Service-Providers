"""
Data Migration Script: SQLite -> Supabase PostgreSQL
=====================================================
Reads all data from the local SQLite carbonlens.db and inserts it into
the Supabase PostgreSQL database configured via DATABASE_URL in .env.

Usage:
    python migrate_to_supabase.py

Prerequisites:
    - Run backup_sqlite.py first
    - Set DATABASE_URL in .env to your Supabase connection string
    - pip install psycopg2-binary
"""

import os
import sys
import sqlite3
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

# Load .env to get DATABASE_URL
load_dotenv()

SQLITE_PATH = os.path.join(os.path.dirname(__file__), "carbonlens.db")
POSTGRES_URL = os.getenv("DATABASE_URL")

# For migration, use direct connection (port 5432) instead of transaction pooler
# (port 6543) to avoid timeouts on large bulk inserts
if POSTGRES_URL:
    POSTGRES_URL = POSTGRES_URL.replace(":6543/", ":5432/")

# Tables in dependency order (respecting foreign keys)
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

BATCH_SIZE = 1000


def validate_config():
    """Validate that we have both SQLite and PostgreSQL configured."""
    if not os.path.exists(SQLITE_PATH):
        print(f"[ERROR] SQLite database not found at: {SQLITE_PATH}")
        return False

    if not POSTGRES_URL:
        print("[ERROR] DATABASE_URL not set in .env file!")
        print("  Set it to your Supabase connection string:")
        print("  DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres")
        return False

    if POSTGRES_URL.startswith("sqlite"):
        print("[ERROR] DATABASE_URL points to SQLite, not PostgreSQL!")
        print("  Update .env with your Supabase connection string.")
        return False

    print(f"[OK] SQLite source: {SQLITE_PATH}")
    print(f"[OK] PostgreSQL target: {POSTGRES_URL[:50]}...")
    return True


def get_sqlite_data(table_name):
    """Read all rows from a SQLite table."""
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # SQLite stores booleans as 0/1 integers; PostgreSQL needs real booleans
    BOOLEAN_COLUMNS = {"is_active", "must_reset_password"}

    try:
        cursor.execute(f"SELECT * FROM [{table_name}]")
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        # Convert Row objects to dicts and fix boolean columns
        data = []
        for row in rows:
            d = dict(row)
            for col in BOOLEAN_COLUMNS:
                if col in d and d[col] is not None:
                    d[col] = bool(d[col])
            data.append(d)
        return columns, data
    except Exception as e:
        print(f"  [WARNING] Could not read table {table_name}: {e}")
        return [], []
    finally:
        conn.close()


def create_tables(pg_engine):
    """Create all tables in PostgreSQL using SQLAlchemy models."""
    # Import the models so Base.metadata knows about all tables
    sys.path.insert(0, os.path.dirname(__file__))
    from core.database import Base
    from models import sql_models  # noqa: F401

    print("\n[1/4] Creating tables in PostgreSQL...")
    Base.metadata.create_all(bind=pg_engine)
    print("  [OK] All tables created")

    # Also create the composite indexes from main.py
    with pg_engine.begin() as conn:
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_usage_records_dataset_year_month ON usage_records (dataset_id, year, month)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_usage_records_dataset_region ON usage_records (dataset_id, region)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_usage_records_dataset_service ON usage_records (dataset_id, service)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_processed_metrics_dataset_year_month ON processed_metrics (dataset_id, year, month)"))
    print("  [OK] Composite indexes created")


def migrate_table(pg_engine, table_name):
    """Migrate a single table from SQLite to PostgreSQL."""
    columns, data = get_sqlite_data(table_name)

    if not data:
        print(f"  [SKIP] {table_name}: 0 rows (empty)")
        return 0

    # Check if table already has data in PostgreSQL
    with pg_engine.connect() as conn:
        # Check if table exists first
        inspector = inspect(pg_engine)
        if table_name not in inspector.get_table_names():
            print(f"  [SKIP] {table_name}: Table does not exist in PostgreSQL")
            return 0

        result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
        existing_count = result.scalar()
        if existing_count > 0:
            print(f"  [SKIP] {table_name}: Already has {existing_count} rows in PostgreSQL")
            return existing_count

    # Build the INSERT statement
    col_list = ", ".join(columns)
    param_list = ", ".join([f":{col}" for col in columns])
    insert_sql = text(f"INSERT INTO {table_name} ({col_list}) VALUES ({param_list})")

    # Insert in batches
    total_inserted = 0
    with pg_engine.begin() as conn:
        for i in range(0, len(data), BATCH_SIZE):
            batch = data[i:i + BATCH_SIZE]
            conn.execute(insert_sql, batch)
            total_inserted += len(batch)

            if len(data) > BATCH_SIZE:
                pct = min(100, int((total_inserted / len(data)) * 100))
                print(f"    ... {table_name}: {total_inserted}/{len(data)} rows ({pct}%)", end="\r")

    if len(data) > BATCH_SIZE:
        print()  # newline after progress

    print(f"  [OK] {table_name}: {total_inserted} rows migrated")
    return total_inserted


def reset_sequences(pg_engine):
    """Reset PostgreSQL auto-increment sequences to match migrated data."""
    print("\n[3/4] Resetting PostgreSQL sequences...")

    tables_with_id = TABLE_ORDER  # All our tables use 'id' as primary key

    with pg_engine.begin() as conn:
        for table in tables_with_id:
            try:
                # Check if the sequence exists
                seq_name = f"{table}_id_seq"
                result = conn.execute(
                    text("SELECT EXISTS(SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = :seq)"),
                    {"seq": seq_name}
                )
                if result.scalar():
                    # Get the max ID from the table
                    max_result = conn.execute(text(f"SELECT COALESCE(MAX(id), 0) FROM {table}"))
                    max_id = max_result.scalar()
                    if max_id > 0:
                        conn.execute(text(f"SELECT setval('{seq_name}', {max_id})"))
                        print(f"  [OK] {table}: sequence reset to {max_id}")
                    else:
                        print(f"  [SKIP] {table}: no rows, sequence unchanged")
                else:
                    print(f"  [SKIP] {table}: no sequence found")
            except Exception as e:
                print(f"  [WARNING] {table}: {e}")


def verify_migration(pg_engine):
    """Compare row counts between SQLite and PostgreSQL."""
    print("\n[4/4] Verifying migration...")
    print("=" * 60)
    print(f"  {'Table':<25} {'SQLite':>10} {'PostgreSQL':>12} {'Match':>8}")
    print("-" * 60)

    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    all_match = True

    for table in TABLE_ORDER:
        # SQLite count
        try:
            cursor = sqlite_conn.cursor()
            cursor.execute(f"SELECT COUNT(*) FROM [{table}]")
            sqlite_count = cursor.fetchone()[0]
        except Exception:
            sqlite_count = -1

        # PostgreSQL count
        try:
            with pg_engine.connect() as conn:
                result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                pg_count = result.scalar()
        except Exception:
            pg_count = -1

        match = sqlite_count == pg_count
        if not match:
            all_match = False
        match_str = "[OK]" if match else "[FAIL]"
        print(f"  {table:<25} {sqlite_count:>10,} {pg_count:>12,} {match_str:>8}")

    sqlite_conn.close()

    print("-" * 60)
    if all_match:
        print("  ALL TABLES MATCH - Migration successful!")
    else:
        print("  WARNING: Some tables have mismatched counts!")
    print("=" * 60)

    return all_match


def main():
    print("=" * 60)
    print("  CarbonLens Data Migration: SQLite -> Supabase PostgreSQL")
    print("=" * 60)
    print()

    if not validate_config():
        sys.exit(1)

    # Create PostgreSQL engine (separate from the app's engine)
    pg_engine = create_engine(
        POSTGRES_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )

    # Test connection
    try:
        with pg_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[OK] PostgreSQL connection successful!\n")
    except Exception as e:
        print(f"[ERROR] Cannot connect to PostgreSQL: {e}")
        sys.exit(1)

    # Step 1: Create tables
    create_tables(pg_engine)

    # Step 2: Migrate data
    print("\n[2/4] Migrating data...")
    for table in TABLE_ORDER:
        migrate_table(pg_engine, table)

    # Step 3: Reset sequences
    reset_sequences(pg_engine)

    # Step 4: Verify
    success = verify_migration(pg_engine)

    pg_engine.dispose()

    if success:
        print("\n[DONE] Migration complete! Your app is now ready to use Supabase PostgreSQL.")
        print("  Start the backend: uvicorn main:app --reload")
    else:
        print("\n[WARNING] Migration completed with warnings. Check the table counts above.")

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
