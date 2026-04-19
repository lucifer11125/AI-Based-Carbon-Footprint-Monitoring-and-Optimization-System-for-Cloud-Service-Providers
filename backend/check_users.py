from sqlalchemy.orm import sessionmaker
from core.database import engine, Base
from models.sql_models import User

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

db = SessionLocal()
users = db.query(User).all()
for u in users:
    print(f"User: {u.email}, role: {u.role}, active: {u.is_active}")
    print(f"Hashed password length: {len(u.hashed_password)}")
    from core.auth import verify_password

    print(f"Verify 'admin123': {verify_password('admin123', u.hashed_password)}")
db.close()
