from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .core.config import settings, UPLOAD_DIR, STATIC_DIR
from .core.database import Base, engine
from .api import (
    users_router,
    games_router,
    telemetry_router,
    reminiscence_router,
    analytics_router,
)

# Initialize Database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-Powered Cognitive Gaming & Health Monitoring Platform for Elderly Care"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(users_router, prefix=settings.API_PREFIX)
app.include_router(games_router, prefix=settings.API_PREFIX)
app.include_router(telemetry_router, prefix=settings.API_PREFIX)
app.include_router(reminiscence_router, prefix=settings.API_PREFIX)
app.include_router(analytics_router, prefix=settings.API_PREFIX)

# Mount Static and Upload directories
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/health")
def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME, "version": settings.VERSION}

@app.get("/")
def serve_index():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "CognitiveAssist API is active. Static files loading..."}
