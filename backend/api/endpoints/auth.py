from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from models.sql_models import User, Company
from schemas.schemas import UserRegister, UserLogin, UserResponse, TokenResponse

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
def register(data: UserRegister, db: Session = Depends(get_db)):
    # Check if email already exists
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # CRITICAL: Force public registration to always create Company Users by default
    data.role = "company_user"

    company_id = None

    # For company_user, handle company assignment
    if data.company_name:
        # Check if company exists
        company = db.query(Company).filter(Company.name == data.company_name).first()
        if not company:
            # Create the company
            company = Company(name=data.company_name)
            db.add(company)
            db.commit()
            db.refresh(company)
        company_id = company.id
    elif data.company_id:
        company = db.query(Company).filter(Company.id == data.company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        company_id = company.id
    else:
        raise HTTPException(
            status_code=400,
            detail="Company name or company_id is required for company users",
        )

    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=data.role,
        company_id=company_id,
        must_reset_password=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    company_name = None
    if user.company_id:
        company = db.query(Company).filter(Company.id == user.company_id).first()
        company_name = company.name if company else None

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            company_id=user.company_id,
            company_name=company_name,
            is_active=user.is_active,
            must_reset_password=user.must_reset_password,
            created_by=user.created_by,
            created_at=user.created_at,
        ),
    )


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact administrator.",
        )

    company_name = None
    if user.company_id:
        company = db.query(Company).filter(Company.id == user.company_id).first()
        company_name = company.name if company else None

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            company_id=user.company_id,
            company_name=company_name,
            is_active=user.is_active,
            must_reset_password=user.must_reset_password,
            created_by=user.created_by,
            created_at=user.created_at,
        ),
    )


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    company_name = None
    if current_user.company_id:
        company = (
            db.query(Company).filter(Company.id == current_user.company_id).first()
        )
        company_name = company.name if company else None

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        company_id=current_user.company_id,
        company_name=company_name,
        is_active=current_user.is_active,
        must_reset_password=current_user.must_reset_password,
        created_by=current_user.created_by,
        created_at=current_user.created_at,
    )


from schemas.schemas import PasswordReset


@router.post("/reset-password", response_model=UserResponse)
def reset_password(
    data: PasswordReset,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    current_user.hashed_password = hash_password(data.new_password)
    current_user.must_reset_password = False
    db.commit()
    db.refresh(current_user)

    company_name = None
    if current_user.company_id:
        company = (
            db.query(Company).filter(Company.id == current_user.company_id).first()
        )
        company_name = company.name if company else None

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        company_id=current_user.company_id,
        company_name=company_name,
        is_active=current_user.is_active,
        must_reset_password=current_user.must_reset_password,
        created_by=current_user.created_by,
        created_at=current_user.created_at,
    )
