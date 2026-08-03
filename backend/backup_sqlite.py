"""
Backup Script for CarbonLens SQLite Database
=============================================
Creates a timestamped copy of carbonlens.db and exports all tables to CSV.
Run this BEFORE making any migration changes.

Usage:
    python backup_sqlite.py
"""

import os
import csv
import shutil
import sqlite3
from datetime import datetime


DB_PATH = os.path.join(os.path.dirname(__file__), "carbonlens.db")
BACKUP_DIR = os.path.join(os.path.dirname(__file__), "backups")


def backup_database():
    """Create a physical copy of the SQLite database file."""
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] Database not found at: {DB_PATH}")
        return False

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"carbonlens_backup_{timestamp}.db"
    backup_path = os.path.join(os.path.dirname(__file__), backup_filename)

    print(f"[1/3] Copying database file...")
    shutil.copy2(DB_PATH, backup_path)
    size_mb = os.path.getsize(backup_path) / (1024 * 1024)
    print(f"  [OK] Backup created: {backup_filename} ({size_mb:.1f} MB)")
    return True


def export_tables_to_csv():
    """Export every table in the SQLite database to individual CSV files."""
    os.makedirs(BACKUP_DIR, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get all table names
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [row[0] for row in cursor.fetchall()]

    if not tables:
        print("[WARNING] No tables found in database!")
        conn.close()
        return {}

    print(f"\n[2/3] Exporting {len(tables)} tables to CSV...")
    row_counts = {}

    for table in tables:
        try:
            cursor.execute(f"SELECT * FROM [{table}]")
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]

            csv_path = os.path.join(BACKUP_DIR, f"{table}.csv")
            with open(csv_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(columns)
                writer.writerows(rows)

            row_counts[table] = len(rows)
            print(f"  [OK] {table}: {len(rows)} rows -> backups/{table}.csv")
        except Exception as e:
            print(f"  [FAIL] {table}: Error - {e}")
            row_counts[table] = -1

    conn.close()
    return row_counts


def print_summary(row_counts):
    """Print a formatted summary of all backed-up tables."""
    print(f"\n[3/3] Backup Summary")
    print("=" * 50)
    print(f"{'Table':<25} {'Rows':>10}")
    print("-" * 50)

    total = 0
    for table, count in sorted(row_counts.items()):
        status = "[FAIL]" if count < 0 else f"{count:>10,}"
        print(f"  {table:<23} {status}")
        if count > 0:
            total += count

    print("-" * 50)
    print(f"  {'TOTAL':<23} {total:>10,}")
    print("=" * 50)
    print(f"\n[OK] Backup complete! Files saved to: backups/")
    print(f"     Database copy: carbonlens_backup_*.db")


if __name__ == "__main__":
    print("=" * 50)
    print("  CarbonLens SQLite Backup Tool")
    print("=" * 50)
    print()

    if not backup_database():
        exit(1)

    row_counts = export_tables_to_csv()
    print_summary(row_counts)

