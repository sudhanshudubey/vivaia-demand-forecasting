"""
==============================================================================
VIVAIA Backend — Forecasting Service
==============================================================================

Core inference module. Loaded once at startup, called by API routes.

Design principles:
    - All artifacts loaded at startup (no per-request disk reads)
    - Single source of truth: feature_schema.json defines feature contract
    - Inference for HIGH segments: rebuild features fresh, then ML predict
    - Inference for LOW segments: route to chosen baseline (mean3 or seasonal)
    - Strict input validation: unknown segments return clear errors
    - Deterministic: same input → same output (no randomness)
==============================================================================
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import lightgbm as lgb

log = logging.getLogger(__name__)


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class PredictionResult:
    country_code:    str
    category:        str
    target_month:    str          # YYYY-MM
    prediction:      float
    model_used:      str          # "lightgbm" | "baseline_mean3" | "baseline_seasonal"
    segment_type:    str          # "HIGH" | "LOW"
    last_known_month: str         # YYYY-MM of latest data we have
    note:            Optional[str] = None


# =============================================================================
# FORECASTING SERVICE (singleton, loaded at startup)
# =============================================================================

class ForecastingService:
    """
    Loads all model artifacts once and serves predictions.

    Public methods:
        predict(country, category, target_month) -> PredictionResult
        list_segments() -> List[(country, category)]
        get_history(country, category) -> pd.DataFrame
        get_backtest_summary() -> dict
    """

    def __init__(self, artifacts_dir: str | Path):
        self.artifacts_dir = Path(artifacts_dir)
        self.model:           Optional[lgb.Booster] = None
        self.schema:          Dict = {}
        self.routing:         pd.DataFrame = pd.DataFrame()
        self.high_features:   pd.DataFrame = pd.DataFrame()
        self.low_history:     pd.DataFrame = pd.DataFrame()
        self.backtest:        Dict = {}
        self.full_history:    pd.DataFrame = pd.DataFrame()
        self._load()

    def _load(self):
        log.info(f"Loading artifacts from {self.artifacts_dir}")

        # 1. Model
        self.model = lgb.Booster(model_file=str(self.artifacts_dir / "final_model.txt"))

        # 2. Feature schema
        with open(self.artifacts_dir / "feature_schema.json") as f:
            self.schema = json.load(f)

        # 3. Segment routing (which segments → ML, which → baseline)
        self.routing = pd.read_csv(self.artifacts_dir / "segment_routing.csv")

        # 4. Last-known feature row per HIGH segment
        self.high_features = pd.read_csv(
            self.artifacts_dir / "segment_index_high.csv",
            parse_dates=["month"],
        )

        # 5. Full history per LOW segment for baseline inference
        self.low_history = pd.read_csv(
            self.artifacts_dir / "segment_history_low.csv",
            parse_dates=["month"],
        )

        # 6. Backtest summary
        with open(self.artifacts_dir / "backtest_results.json") as f:
            self.backtest = json.load(f)

        # 7. Full history dataset (for /history endpoint and chart rendering)
        # We build this from high_features + low_history
        # (the actual full history lives in vivaia_agg_monthly.csv from Phase 1)
        full_path = self.artifacts_dir / "vivaia_agg_monthly.csv"
        if full_path.exists():
            self.full_history = pd.read_csv(full_path, parse_dates=["month"])
        else:
            # Fall back to combining what we have
            cols = ["country_code", "category", "month", "total_pcs"]
            self.full_history = pd.concat([
                self.high_features[cols],
                self.low_history[cols],
            ], ignore_index=True)

        log.info(f"Loaded: {len(self.routing)} segments "
                 f"({(self.routing['segment_type']=='HIGH').sum()} HIGH, "
                 f"{(self.routing['segment_type']=='LOW').sum()} LOW)")

    # -------------------------------------------------------------------------
    # CATALOG / METADATA
    # -------------------------------------------------------------------------

    def list_segments(self) -> List[Dict]:
        """Returns every available (country, category) with its routing info."""
        return self.routing[
            ["country_code", "category", "segment_type", "avg_volume", "baseline_winner"]
        ].to_dict(orient="records")

    def get_history(self, country: str, category: str) -> List[Dict]:
        """Returns historical monthly sales for a segment (for chart rendering)."""
        sub = self.full_history[
            (self.full_history["country_code"] == country) &
            (self.full_history["category"]     == category)
        ].sort_values("month")
        if len(sub) == 0:
            return []
        return [
            {"month": row["month"].strftime("%Y-%m"),
             "actual": float(row["total_pcs"])}
            for _, row in sub.iterrows()
        ]

    def get_backtest_summary(self) -> Dict:
        return self.backtest

    # -------------------------------------------------------------------------
    # PREDICTION
    # -------------------------------------------------------------------------

    def predict(
        self,
        country: str,
        category: str,
        target_month: str,
    ) -> PredictionResult:
        """
        Forecast units sold for the given segment in the given target month.
        target_month format: "YYYY-MM" (e.g. "2026-01").
        """
        # ── Validate inputs ─────────────────────────────────────────────
        try:
            target_dt = pd.to_datetime(f"{target_month}-01")
        except Exception:
            raise ValueError(f"Invalid target_month format: '{target_month}' "
                             "(expected YYYY-MM)")

        seg_row = self.routing[
            (self.routing["country_code"] == country) &
            (self.routing["category"]     == category)
        ]
        if len(seg_row) == 0:
            raise ValueError(f"Unknown segment: {country} × {category}. "
                             "Use /segments to see available combinations.")

        segment_type = seg_row.iloc[0]["segment_type"]

        # ── Route to the appropriate predictor ──────────────────────────
        if segment_type == "HIGH":
            return self._predict_ml(country, category, target_dt)
        else:
            baseline_winner = seg_row.iloc[0]["baseline_winner"]
            return self._predict_baseline(country, category, target_dt, baseline_winner)

    # -------------------------------------------------------------------------
    # ML PREDICTION (HIGH segments)
    # -------------------------------------------------------------------------

    def _predict_ml(
        self,
        country: str,
        category: str,
        target_dt: pd.Timestamp,
    ) -> PredictionResult:
        """
        For HIGH segments: use the saved last-known feature row, but update
        time-dependent features (month_num, sin/cos, peak_season, holiday flags)
        to match the target month.

        IMPORTANT: lag_1, roll_*, price features etc. are computed from data
        UP TO the last-known month. For 1-month-ahead forecast (the only mode
        we trained), this is exactly what the model expects.
        """
        seg_features = self.high_features[
            (self.high_features["country_code"] == country) &
            (self.high_features["category"]     == category)
        ]
        if len(seg_features) == 0:
            raise ValueError(f"Segment {country} × {category} has no feature row")

        # Take the most recent row
        feat_row = seg_features.sort_values("month").iloc[-1].copy()
        last_known_month = feat_row["month"]

        # Validate target_dt is exactly one month after last_known
        # (1-month-ahead is the only mode supported)
        expected_target = last_known_month + pd.DateOffset(months=1)
        if target_dt != expected_target:
            log.warning(
                f"Target month {target_dt.strftime('%Y-%m')} is not exactly "
                f"one month after last known data {last_known_month.strftime('%Y-%m')}. "
                f"Lag features may be stale."
            )

        # Update time-dependent features to reflect TARGET month, not last_known
        feat_row["month_num"]              = target_dt.month
        feat_row["quarter"]                = target_dt.quarter
        feat_row["month_sin"]              = np.sin(2 * np.pi * target_dt.month / 12)
        feat_row["month_cos"]              = np.cos(2 * np.pi * target_dt.month / 12)
        feat_row["is_peak_season"]         = self._is_peak_season(
            target_dt.month, feat_row.get("hemisphere", "Northern")
        )
        feat_row["is_black_friday_month"]  = int(target_dt.month == 11)
        feat_row["is_holiday_season"]      = int(target_dt.month in (11, 12))

        # Build feature vector in the schema-defined order
        feature_cols = self.schema["feature_cols"]
        X = pd.DataFrame([{c: feat_row[c] for c in feature_cols}])

        # Predict
        y_pred = float(self.model.predict(X, num_iteration=self.model.best_iteration)[0])
        y_pred = max(y_pred, 0.0)

        return PredictionResult(
            country_code     = country,
            category         = category,
            target_month     = target_dt.strftime("%Y-%m"),
            prediction       = round(y_pred, 1),
            model_used       = "lightgbm",
            segment_type     = "HIGH",
            last_known_month = last_known_month.strftime("%Y-%m"),
            note             = None if target_dt == expected_target else
                               "Target month is not 1 step ahead of last known data; result may be less reliable.",
        )

    @staticmethod
    def _is_peak_season(month: int, hemisphere: str) -> int:
        northern_peak = {10, 11, 12}
        southern_peak = {9, 10, 11}
        if hemisphere == "Southern":
            return int(month in southern_peak)
        return int(month in northern_peak)

    # -------------------------------------------------------------------------
    # BASELINE PREDICTION (LOW segments)
    # -------------------------------------------------------------------------

    def _predict_baseline(
        self,
        country: str,
        category: str,
        target_dt: pd.Timestamp,
        baseline_winner: str,
    ) -> PredictionResult:
        history = self.low_history[
            (self.low_history["country_code"] == country) &
            (self.low_history["category"]     == category)
        ].sort_values("month")

        if len(history) == 0:
            raise ValueError(f"No history for LOW segment {country} × {category}")

        last_known_month = history["month"].max()

        if baseline_winner == "seasonal":
            year_ago = target_dt - pd.DateOffset(years=1)
            match = history.loc[history["month"] == year_ago, "total_pcs"]
            if len(match) > 0 and not pd.isna(match.iloc[0]):
                pred = float(match.iloc[0])
                model_used = "baseline_seasonal"
            else:
                # Fall back to mean3
                pred = float(history["total_pcs"].dropna().tail(3).mean())
                model_used = "baseline_seasonal_fallback_mean3"
        else:
            # mean3
            pred = float(history["total_pcs"].dropna().tail(3).mean())
            model_used = "baseline_mean3"

        pred = max(pred, 0.0)

        return PredictionResult(
            country_code     = country,
            category         = category,
            target_month     = target_dt.strftime("%Y-%m"),
            prediction       = round(pred, 1),
            model_used       = model_used,
            segment_type     = "LOW",
            last_known_month = last_known_month.strftime("%Y-%m"),
            note             = "Low-volume segment; baseline used due to sparse demand pattern.",
        )
