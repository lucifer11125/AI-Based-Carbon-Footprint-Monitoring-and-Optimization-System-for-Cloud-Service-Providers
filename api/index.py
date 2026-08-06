import sys
import os

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, ".env"))

from main import app as fastapi_app  # noqa: E402


class VercelPathMiddleware:
    """
    Ensures that rewritten requests on Vercel reach the intended FastAPI routes.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            raw_path = scope.get("path", "")
            headers = dict(scope.get("headers", []))

            # Log path and Vercel routing headers
            matched = (
                headers.get(b"x-matched-path", b"").decode("utf-8", "ignore")
                or headers.get(b"x-forwarded-uri", b"").decode("utf-8", "ignore")
                or headers.get(b"x-real-path", b"").decode("utf-8", "ignore")
            )

            # If the path arrived as the handler script itself (/api/index.py or /api/index)
            if raw_path in ("/api/index.py", "/api/index", "/api/index.py/", "") and matched:
                target = matched.split("?")[0]
                scope = dict(scope)
                scope["path"] = target
                scope["raw_path"] = target.encode("utf-8")

        await self.app(scope, receive, send)


app = VercelPathMiddleware(fastapi_app)
