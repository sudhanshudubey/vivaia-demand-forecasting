// Shows the headline model quality numbers from the backtest.

function MetricRow({ label, value, suffix = "" }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900 tabular-nums">
        {value != null ? `${value.toFixed(1)}${suffix}` : "—"}
      </span>
    </div>
  );
}

export function BacktestPanel({ summary }) {
  if (!summary) return null;

  const ml = summary.ml?.aggregate || {};
  const baseline = summary.baseline?.aggregate || {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-brand-50 border border-brand-100 p-3">
          <p className="text-xs font-medium text-brand-700">HIGH-volume (ML)</p>
          <p className="mt-0.5 text-2xl font-bold text-brand-800 tabular-nums">
            {summary.n_high_segments}
          </p>
          <p className="text-xs text-brand-600 mt-0.5">segments</p>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
          <p className="text-xs font-medium text-amber-700">LOW-volume (Baseline)</p>
          <p className="mt-0.5 text-2xl font-bold text-amber-800 tabular-nums">
            {summary.n_low_segments}
          </p>
          <p className="text-xs text-amber-600 mt-0.5">segments</p>
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t border-slate-100">
        <div>
          <p className="text-xs font-semibold text-slate-700 mb-2">
            ML model performance
          </p>
          <div className="space-y-1.5">
            <MetricRow label="MAE (units)" value={ml.MAE} />
            <MetricRow label="RMSE (units)" value={ml.RMSE} />
            <MetricRow label="sMAPE" value={ml.sMAPE} suffix="%" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-700 mb-2">
            Baseline performance
          </p>
          <div className="space-y-1.5">
            <MetricRow label="MAE (units)" value={baseline.MAE} />
            <MetricRow label="RMSE (units)" value={baseline.RMSE} />
            <MetricRow label="sMAPE" value={baseline.sMAPE} suffix="%" />
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500 italic pt-2 border-t border-slate-100">
        Validated via {summary.n_folds || 6}-fold walk-forward backtest on Jul–Dec 2025.
      </p>
    </div>
  );
}
