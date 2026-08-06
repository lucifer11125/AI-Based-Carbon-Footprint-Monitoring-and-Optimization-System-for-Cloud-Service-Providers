import sys
import os

# Add the backend directory to sys.path so all backend modules resolve
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Load .env from the backend directory if running locally (no-op on Vercel)
from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, ".env"))

from main import app  # noqa: E402 — must come after sys.path is set

# Vercel expects the ASGI app to be named `app` at module level
