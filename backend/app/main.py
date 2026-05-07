"""
==============================================================================
VIVAIA Backend — FastAPI Application
==============================================================================

Endpoints:
    GET  /                         — health check
    GET  /segments                 — list available country×category segments
    GET  /history/{country}/{cat}  — historical monthly sales
    POST /predict                  — single forecast
    GET  /backtest_summary         — model performance metrics

Production notes:
    - Service loaded ONCE at startup (lifespan event), not per-request
    - CORS open in dev; restrict to frontend domain in production via env var
    - Errors return clean JSON responses with HTTP status codes
    - No silent failures: validation errors → 400, missing segments → 404
==============================================================================
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from app.forecasting_service import ForecastingService, PredictionResult

# =============================================================================
# CONFIG
# =============================================================================

ARTIFACTS_DIR = Path(os.getenv("ARTIFACTS_DIR", "models"))

# Comma-separated list of allowed frontend origins. In dev, set to "*"
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")


# =============================================================================
# LOGGING
# =============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("vivaia_api")


# =============================================================================
# REQUEST / RESPONSE SCHEMAS
# =============================================================================

class PredictRequest(BaseModel):
    country_code: str = Field(..., min_length=2, max_length=3,
                              description="ISO-2 country code, e.g. 'US'")
    category:     str = Field(..., min_length=1,
                              description="Category code, e.g. 'CAT_005'")
    target_month: str = Field(..., pattern=r"^\d{4}-\d{2}$",
                              description="Target month in YYYY-MM format")

    @field_validator("country_code")
    @classmethod
    def upper_country(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("category")
    @classmethod
    def upper_category(cls, v: str) -> str:
        return v.strip().upper()


class PredictResponse(BaseModel):
    country_code:     str
    category:         str
    target_month:     str
    prediction:       float
    model_used:       str
    segment_type:     str
    last_known_month: str
    note:             Optional[str] = None


class SegmentInfo(BaseModel):
    country_code:    str
    category:        str
    segment_type:    str
    avg_volume:      float
    baseline_winner: str


class HistoryPoint(BaseModel):
    month:  str
    actual: float


# =============================================================================
# APP LIFESPAN — load service once at startup
# =============================================================================

service: Optional[ForecastingService] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global service
    log.info(f"Starting up. ARTIFACTS_DIR = {ARTIFACTS_DIR.resolve()}")
    if not ARTIFACTS_DIR.exists():
        log.error(f"Artifacts dir missing: {ARTIFACTS_DIR}")
        raise RuntimeError(f"Cannot start: artifacts dir not found at {ARTIFACTS_DIR}")
    service = ForecastingService(ARTIFACTS_DIR)
    log.info("Service ready")
    yield
    log.info("Shutting down")


# =============================================================================
# APP
# =============================================================================

app = FastAPI(
    title="VIVAIA Demand Forecasting API",
    description="Hybrid forecasting (LightGBM + per-segment baselines) for 2026 sales",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# =============================================================================
# GLOBAL EXCEPTION HANDLER
# =============================================================================

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Domain validation errors from the service map to 400 Bad Request."""
    log.warning(f"ValueError on {request.url.path}: {exc}")
    return JSONResponse(status_code=400, content={"detail": str(exc)})


# =============================================================================
# ROUTES
# =============================================================================

@app.get("/")
def health_check():
    return {
        "status":  "ok",
        "service": "VIVAIA Demand Forecasting API",
        "version": "1.0.0",
    }


@app.get("/segments", response_model=List[SegmentInfo])
def list_segments():
    """Returns every available (country, category) with its routing info."""
    if service is None:
        raise HTTPException(status_code=503, detail="Service not yet initialized")
    return service.list_segments()


@app.get("/history/{country_code}/{category}", response_model=List[HistoryPoint])
def get_history(country_code: str, category: str):
    """
    Returns historical monthly sales for a segment.
    Used by the frontend to render the actuals line on the forecast chart.
    """
    if service is None:
        raise HTTPException(status_code=503, detail="Service not yet initialized")

    cc  = country_code.strip().upper()
    cat = category.strip().upper()
    history = service.get_history(cc, cat)
    if not history:
        raise HTTPException(
            status_code=404,
            detail=f"No history found for {cc} × {cat}",
        )
    return history


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    """
    Forecast units sold for the given segment in the given target month.

    Routing:
        HIGH segments → LightGBM model
        LOW  segments → per-segment baseline (mean3 or seasonal)

    Returns the forecast plus metadata about which model was used.
    """
    if service is None:
        raise HTTPException(status_code=503, detail="Service not yet initialized")

    result: PredictionResult = service.predict(
        country      = req.country_code,
        category     = req.category,
        target_month = req.target_month,
    )
    return result.__dict__


@app.get("/backtest_summary")
def backtest_summary():
    """Walk-forward backtest results — for displaying model quality on the frontend."""
    if service is None:
        raise HTTPException(status_code=503, detail="Service not yet initialized")
    return service.get_backtest_summary()
