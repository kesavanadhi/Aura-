import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

import uvicorn
from app.config import settings

if __name__ == "__main__":
    print("=" * 70)
    print(f"  {settings.PROJECT_NAME} — {settings.PROJECT_TITLE}")
    print(f"  Version: {settings.VERSION} | Core Cycle: Sense -> Understand -> Act")
    print(f"  Strict Sensor Exclusions: Zero Water Leakage | Zero Magnetic Door")
    print(f"  Emergency Ambulance Integration: 108 Hotline Active")
    print("=" * 70)
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False,
        log_level="info"
    )
