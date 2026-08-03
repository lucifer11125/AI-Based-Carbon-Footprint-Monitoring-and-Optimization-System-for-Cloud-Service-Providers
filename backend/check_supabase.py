"""Quick check of Supabase state."""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
url = os.getenv("DATABASE_URL").replace(":6543/", ":5432/")
e = create_engine(url)
conn = e.connect()

r = conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"))
tables = [row[0] for row in r]

if not tables:
    print("No tables found in public schema.")
else:
    print(f"Found {len(tables)} tables:")
    for t in tables:
        count = conn.execute(text(f"SELECT COUNT(*) FROM \"{t}\"")).scalar()
        print(f"  {t}: {count} rows")

conn.close()
e.dispose()
