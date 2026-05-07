import { useEffect, useState, useCallback } from "react";

import { api, ApiError, API_BASE_URL } from "./lib/api.js";

import { Header } from "./components/Header.jsx";
import { Card } from "./components/Card.jsx";
import { Filters } from "./components/Filters.jsx";
import { ForecastCard } from "./components/ForecastCard.jsx";
import { ForecastChart } from "./components/ForecastChart.jsx";
import { BacktestPanel } from "./components/BacktestPanel.jsx";
import { ErrorBanner } from "./components/ErrorBanner.jsx";
import { Spinner, SkeletonBlock } from "./components/Spinner.jsx";

const DEFAULT_MONTH = "2026-01";

export default function App() {
  // Catalog state
  const [segments, setSegments] = useState([]);
  const [segmentsLoading, setSegmentsLoading] = useState(true);
  const [segmentsError, setSegmentsError] = useState(null);

  // Backtest summary
  const [backtest, setBacktest] = useState(null);

  // User selections
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [targetMonth, setTargetMonth] = useState(DEFAULT_MONTH);

  // Forecast result
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState(null);

  // History
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Load segments + backtest on mount ───────────────────────────────────
  const loadCatalog = useCallback(async () => {
    setSegmentsLoading(true);
    setSegmentsError(null);
    try {
      const [segs, bt] = await Promise.all([
        api.listSegments(),
        api.getBacktest(),
      ]);
      setSegments(segs);
      setBacktest(bt);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : String(err);
      setSegmentsError(msg);
    } finally {
      setSegmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // ── Load history when (country, category) changes ───────────────────────
  useEffect(() => {
    if (!country || !category) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    api
      .getHistory(country, category)
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [country, category]);

  // ── Reset category when country changes ─────────────────────────────────
  function handleCountryChange(c) {
    setCountry(c);
    setCategory("");
    setForecast(null);
  }

  function handleCategoryChange(c) {
    setCategory(c);
    setForecast(null);
  }

  // ── Submit forecast ─────────────────────────────────────────────────────
  const submitForecast = useCallback(async () => {
    setForecastLoading(true);
    setForecastError(null);
    setForecast(null);
    try {
      const result = await api.predict({
        country_code: country,
        category,
        target_month: targetMonth,
      });
      setForecast(result);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : String(err);
      setForecastError(msg);
    } finally {
      setForecastLoading(false);
    }
  }, [country, category, targetMonth]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Catalog error blocks everything else */}
        {segmentsError && (
          <ErrorBanner
            message={`${segmentsError} (API base: ${API_BASE_URL})`}
            onRetry={loadCatalog}
          />
        )}

        {/* Filters */}
        <Card title="Forecast inputs" subtitle="Choose a segment and target month">
          <Filters
            segments={segments}
            country={country}
            category={category}
            targetMonth={targetMonth}
            onCountryChange={handleCountryChange}
            onCategoryChange={handleCategoryChange}
            onMonthChange={setTargetMonth}
            onSubmit={submitForecast}
            isSubmitting={forecastLoading}
            isLoadingSegments={segmentsLoading}
          />
        </Card>

        {/* Forecast result + chart + backtest */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — forecast result */}
          <Card title="Forecast result" className="lg:col-span-1">
            {forecastError && (
              <div className="mb-4">
                <ErrorBanner message={forecastError} onRetry={submitForecast} />
              </div>
            )}
            {forecastLoading ? (
              <div className="flex items-center gap-3 py-10">
                <Spinner />
                <span className="text-sm text-slate-600">
                  Running forecast…
                </span>
              </div>
            ) : (
              <ForecastCard result={forecast} />
            )}
          </Card>

          {/* Middle/right — chart */}
          <Card
            title="History & forecast"
            subtitle={
              country && category
                ? `${country} × ${category}`
                : "Select a segment to view history"
            }
            className="lg:col-span-2"
          >
            {historyLoading ? (
              <SkeletonBlock className="h-72 w-full" />
            ) : (
              <ForecastChart history={history} forecast={forecast} />
            )}
          </Card>
        </div>

        {/* Backtest summary */}
        <Card
          title="Model quality (walk-forward backtest)"
          subtitle="Hybrid: HIGH-volume → LightGBM, LOW-volume → per-segment baseline"
        >
          {segmentsLoading ? (
            <div className="space-y-2">
              <SkeletonBlock className="h-20 w-full" />
              <SkeletonBlock className="h-32 w-full" />
            </div>
          ) : (
            <BacktestPanel summary={backtest} />
          )}
        </Card>
      </main>

      <footer className="border-t border-slate-200 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-xs text-slate-500 text-center">
          VIVAIA Demand Forecasting — Phase 3 dashboard
        </div>
      </footer>
    </div>
  );
}
