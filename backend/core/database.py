import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Load .env file if present
load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./carbonlens.db"  # local fallback for dev
)

_is_sqlite = SQLALCHEMY_DATABASE_URL.startswith("sqlite")

# SQLite needs check_same_thread=False; PostgreSQL uses connection pooling
_connect_args = {"check_same_thread": False} if _is_sqlite else {}

# PostgreSQL gets connection pool settings; SQLite doesn't support them
_pool_kwargs = {} if _is_sqlite else {"pool_size": 5, "max_overflow": 10}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=_connect_args,
    pool_pre_ping=True,
    **_pool_kwargs,
)

# Only apply SQLite PRAGMAs when running locally with SQLite
if _is_sqlite:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=-8000")    # 8MB cache
        cursor.execute("PRAGMA busy_timeout=5000")   # Wait up to 5s instead of failing immediately
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

