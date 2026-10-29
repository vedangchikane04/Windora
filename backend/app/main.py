import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.config import settings
from app.api.routes import router as api_router, get_loaded_datasets

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger("windora")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Windora backend service...")
    try:
        # Pre-warm cache on startup
        fuel, wf = get_loaded_datasets()
        logger.info(f"Windora datasets ready: {len(fuel)} FUELHH actuals, {len(wf)} WINDFOR forecasts.")
    except Exception as e:
        logger.warning(f"Initial dataset preload error: {e}")
    yield
    logger.info("Windora backend service shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "Production-quality UK day-ahead wind generation forecasting and accuracy analysis platform. "
        "Reconstructs historical forecasts under strict day-ahead decision cutoffs using official Elexon BMRS datasets."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", include_in_schema=False)
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "health": f"{settings.API_V1_STR}/health",
        "status": "online"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
