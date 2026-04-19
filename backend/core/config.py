import os
from dotenv import load_dotenv

# Load variables from .env file (if exists)
load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key-for-dev")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours default

# Region emission factors (kgCO2/kWh)
REGION_EMISSION_FACTORS = {
    "us-east-1": 0.42,
    "us-east-2": 0.38,
    "us-west-1": 0.22,
    "us-west-2": 0.18,
    "eu-west-1": 0.30,
    "eu-central-1": 0.35,
    "ap-south-1": 0.70,
    "ap-southeast-1": 0.45,
    "ap-northeast-1": 0.50,
    "ca-central-1": 0.12,
    "sa-east-1": 0.08,
    "eu-north-1": 0.01,
    "default": 0.40,
}
