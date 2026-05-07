// Filters: country select, category select (filtered by country), month picker.

const MONTH_OPTIONS = [
  "2026-01", "2026-02", "2026-03", "2026-04",
  "2026-05", "2026-06", "2026-07", "2026-08",
  "2026-09", "2026-10", "2026-11", "2026-12",
];

function fieldLabel(text) {
  return (
    <label className="block text-xs font-medium text-slate-600 mb-1.5">
      {text}
    </label>
  );
}

const selectClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 " +
  "disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed";

export function Filters({
  segments,
  country,
  category,
  targetMonth,
  onCountryChange,
  onCategoryChange,
  onMonthChange,
  onSubmit,
  isSubmitting,
  isLoadingSegments,
}) {
  // Build distinct countries from segments
  const countries = Array.from(
    new Set((segments || []).map((s) => s.country_code))
  ).sort();

  // Categories filtered by selected country
  const categories = country
    ? Array.from(
        new Set(
          (segments || [])
            .filter((s) => s.country_code === country)
            .map((s) => s.category)
        )
      ).sort()
    : [];

  // Selected segment metadata (for badge in form)
  const selectedSegment = (segments || []).find(
    (s) => s.country_code === country && s.category === category
  );

  const canSubmit = country && category && targetMonth && !isSubmitting;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Country */}
        <div>
          {fieldLabel("Country")}
          <select
            value={country}
            onChange={(e) => onCountryChange(e.target.value)}
            disabled={isLoadingSegments}
            className={selectClass}
          >
            <option value="">
              {isLoadingSegments ? "Loading…" : "Select a country"}
            </option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div>
          {fieldLabel("Category")}
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            disabled={!country || isLoadingSegments}
            className={selectClass}
          >
            <option value="">
              {!country ? "Select country first" : "Select a category"}
            </option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Month */}
        <div>
          {fieldLabel("Forecast month")}
          <select
            value={targetMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className={selectClass}
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="min-h-[20px]">
          {selectedSegment && (
            <span
              className={
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset " +
                (selectedSegment.segment_type === "HIGH"
                  ? "bg-brand-50 text-brand-700 ring-brand-100"
                  : "bg-amber-50 text-amber-700 ring-amber-100")
              }
            >
              <span
                className={
                  "h-1.5 w-1.5 rounded-full " +
                  (selectedSegment.segment_type === "HIGH"
                    ? "bg-brand-500"
                    : "bg-amber-500")
                }
              />
              {selectedSegment.segment_type === "HIGH"
                ? "ML model (high volume)"
                : "Baseline (low volume)"}
              <span className="text-slate-500 font-normal ml-1">
                · avg {selectedSegment.avg_volume.toFixed(0)}/mo
              </span>
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className={
            "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors " +
            (canSubmit
              ? "bg-brand-600 text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              : "bg-slate-200 text-slate-400 cursor-not-allowed")
          }
        >
          {isSubmitting ? "Forecasting…" : "Generate forecast"}
        </button>
      </div>
    </form>
  );
}
