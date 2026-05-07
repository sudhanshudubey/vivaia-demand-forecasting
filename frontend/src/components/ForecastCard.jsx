// Renders the predicted units + metadata.

function formatNumber(n) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

const MODEL_LABEL = {
  lightgbm:                       "LightGBM",
  baseline_mean3:                 "3-month avg baseline",
  baseline_seasonal:              "Seasonal (year-ago) baseline",
  baseline_seasonal_fallback_mean3:"Seasonal baseline (mean fallback)",
};

export function ForecastCard({ result }) {
  if (!result) {
    return (
      <div className="text-sm text-slate-500 italic">
        Select a country, category, and month, then generate a forecast.
      </div>
    );
  }

  const isHigh = result.segment_type === "HIGH";

  return (
    <div className="space-y-5">
      {/* Big number */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Predicted units · {result.target_month}
        </p>
        <p className="mt-1 text-4xl font-bold text-slate-900 tabular-nums">
          {formatNumber(result.prediction)}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {result.country_code} × {result.category}
        </p>
      </div>

      {/* Metadata grid */}
      <dl className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
        <div>
          <dt className="text-xs font-medium text-slate-500">Model</dt>
          <dd className="mt-0.5 text-sm font-medium text-slate-900">
            {MODEL_LABEL[result.model_used] || result.model_used}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">Segment type</dt>
          <dd className="mt-0.5">
            <span
              className={
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset " +
                (isHigh
                  ? "bg-brand-50 text-brand-700 ring-brand-100"
                  : "bg-amber-50 text-amber-700 ring-amber-100")
              }
            >
              {isHigh ? "HIGH volume" : "LOW volume"}
            </span>
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs font-medium text-slate-500">Last known month</dt>
          <dd className="mt-0.5 text-sm font-medium text-slate-900">
            {result.last_known_month}
          </dd>
        </div>
      </dl>

      {/* Reliability note */}
      {result.note && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          <span className="font-medium">Note:</span> {result.note}
        </div>
      )}
    </div>
  );
}
