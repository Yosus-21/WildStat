from fastapi import FastAPI

from app.routes.detect import router as detect_router
from faunalens_ai.config import settings

app = FastAPI(title=settings.app_name, version="0.1.0")
app.include_router(detect_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
