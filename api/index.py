import sys
import os
import urllib.parse

# Add the backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Load .env from backend directory (no-op on Vercel where env vars come from dashboard)
from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, ".env"))

from main import app as _fastapi_app  # noqa: E402


class VercelPathFixer:
    """
    Vercel's 'internal rewrites' behavior sends the rewritten DESTINATION path
    to the FastAPI ASGI scope (e.g. /api/index.py) instead of the original
    request path (e.g. /api/auth/login).

    We work around this by embedding the original path as a '__vpath' query
    parameter in the rewrite destination. This middleware reads it and restores
    the correct path in the ASGI scope before FastAPI's router runs.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            raw_qs = scope.get("query_string", b"").decode("utf-8")
            params = urllib.parse.parse_qs(raw_qs, keep_blank_values=True)

            if "__vpath" in params:
                # Restore original path (Vercel merges rewrite-dest QS with request QS)
                original_path = "/" + urllib.parse.unquote(params["__vpath"][0])
                scope = dict(scope)
                scope["path"] = original_path

                # Strip __vpath from query string before forwarding to FastAPI
                cleaned = {k: v for k, v in params.items() if k != "__vpath"}
                scope["query_string"] = urllib.parse.urlencode(
                    cleaned, doseq=True
                ).encode()

        await self.app(scope, receive, send)


# Vercel looks for `app` at module level — wrap FastAPI with the path fixer
app = VercelPathFixer(_fastapi_app)
