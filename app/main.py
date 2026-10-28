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

# Mount Morning Routine Builder (Research Prototype)
ROUTINE_DIST_DIR = Path(__file__).resolve().parent.parent / "morning-routine-builder" / "dist"
if ROUTINE_DIST_DIR.exists():
    app.mount("/morning-routine", StaticFiles(directory=str(ROUTINE_DIST_DIR), html=True), name="morning-routine")

@app.get("/routine")
def serve_routine():
    index_path = ROUTINE_DIST_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return {"message": "Morning Routine Builder dist not found. Please run npm run build."}

# Mount Neighbourhood Walk (Spatial Memory Prototype)
WALK_DIST_DIR = Path(__file__).resolve().parent.parent / "neighbourhood-walk" / "dist"
if WALK_DIST_DIR.exists():
    app.mount("/neighbourhood-walk", StaticFiles(directory=str(WALK_DIST_DIR), html=True), name="neighbourhood-walk")

@app.get("/walk")
def serve_walk():
    index_path = WALK_DIST_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    return {"message": "Neighbourhood Walk dist not found. Please run npm run build."}

@app.get("/health")
def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME, "version": settings.VERSION}

@app.get("/")
def serve_root():
    landing_file = STATIC_DIR / "landing.html"
    if landing_file.exists():
        return FileResponse(str(landing_file))
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "CognitiveAssist API is active. Static files loading..."}

@app.get("/landing")
def serve_landing():
    landing_file = STATIC_DIR / "landing.html"
    if landing_file.exists():
        return FileResponse(str(landing_file))
    return FileResponse(str(STATIC_DIR / "index.html"))

@app.get("/app")
def serve_app():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "CognitiveAssist Platform is loading..."}

@app.get("/portal")
def serve_portal():
    return serve_app()

@app.get("/login")
def serve_login():
    login_file = STATIC_DIR / "login.html"
    if login_file.exists():
        return FileResponse(str(login_file))
    return FileResponse(str(STATIC_DIR / "index.html"))
