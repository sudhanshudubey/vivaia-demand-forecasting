export function Header() {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-brand-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900 leading-tight">
              VIVAIA Demand Forecasting
            </h1>
            <p className="text-xs text-slate-500 leading-tight">
              Hybrid ML + baseline forecasting · 2026 outlook
            </p>
          </div>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-100">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          v1.0
        </span>
      </div>
    </header>
  );
}
