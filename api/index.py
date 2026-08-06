import sys
import os
import urllib.parse

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, ".env"))

from main import app as fastapi_app  # noqa: E402


class VercelPathMiddleware:
    """
    On Vercel, internal rewrites route requests to /api/index.py.
    This middleware restores the original subpath from the __path query param
    so that FastAPI router can match all routes (/api/auth/login, /api/admin/overview, etc.).
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            query_string = scope.get("query_string", b"").decode("utf-8")
            params = urllib.parse.parse_qs(query_string, keep_blank_values=True)

            if "__path" in params and params["__path"]:
                target_subpath = params["__path"][0]
                if not target_subpath.startswith("/"):
                    target_subpath = "/" + target_subpath
                if not target_subpath.startswith("/api"):
                    target_path = "/api" + target_subpath
                else:
                    target_path = target_subpath

                # Remove __path from query string
                cleaned_params = {k: v for k, v in params.items() if k != "__path"}
                cleaned_qs = urllib.parse.urlencode(cleaned_params, doseq=True)

                scope = dict(scope)
                scope["path"] = target_path
                scope["raw_path"] = target_path.encode("utf-8")
                scope["query_string"] = cleaned_qs.encode("utf-8")

        await self.app(scope, receive, send)


app = VercelPathMiddleware(fastapi_app)
