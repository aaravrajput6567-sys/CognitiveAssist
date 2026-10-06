"""
CognitiveAssist Main Application Runner
Executes database initialization, seeds sample clinical data,
and launches the FastAPI server on http://localhost:8000.
"""
import sys
import uvicorn
from app.core.seed_data import seed_database
from app.core.config import settings

def main():
    print("=" * 65)
    print("  CognitiveAssist: AI-Powered Cognitive Gaming & Health Platform")
    print("  Domain: Healthcare, Computer Vision & Generative AI")
    print("  Healthcare AI & Cognitive Assistive Platform")
    print("=" * 65)
    
    # 1. Initialize and seed database
    print("\n[1/2] Initializing SQLite database and verifying sample records...")
    seed_database()

    # 2. Launch FastAPI Server
    print("[2/2] Starting server at: http://localhost:8000")
    print("      Senior Portal:       http://localhost:8000")
    print("      Caregiver Analytics: http://localhost:8000 (Switch to Caregiver Portal tab)")
    print("      API Documentation:   http://localhost:8000/docs")
    print("\nPress Ctrl+C to stop the server.\n")

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)

if __name__ == "__main__":
    main()
