import sys
import os
import urllib.parse

# Add the backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Load .env from backend directory
from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, ".env"))

from main import app as fastapi_app  # noqa: E402


class VercelPathMiddleware:
    """
    On Vercel, serverless function rewrites might deliver the internal destination
    path (e.g. /api/index.py) instead of the original user-requested path.
    This middleware extracts the original requested path from standard Vercel
    headers or query parameters and restores it into the ASGI scope.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = dict(scope.get("headers", []))

            # Check headers injected by Vercel Edge / CDN
            matched_path = (
                headers.get(b"x-matched-path")
                or headers.get(b"x-forwarded-uri")
                or headers.get(b"x-original-url")
                or headers.get(b"x-vercel-matched-path")
            )

            target_path = None
            if matched_path:
                target_path = matched_path.decode("utf-8", errors="ignore").split("?")[0]

            # If no header matched or if path is the function file name
            raw_path = scope.get("path", "")
            if (raw_path in ("/api/index.py", "/api/index", "/api/index.py/", "") or not raw_path) and target_path:
                scope = dict(scope)
                scope["path"] = target_path
                scope["raw_path"] = target_path.encode("utf-8")

        await self.app(scope, receive, send)


app = VercelPathMiddleware(fastapi_app)
