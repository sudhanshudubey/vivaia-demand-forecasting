export function Card({ title, subtitle, children, className = "" }) {
  return (
    <section
      className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 ${className}`}
    >
      {(title || subtitle) && (
        <header className="mb-4">
          {title && (
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          )}
          {subtitle && (
            <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
          )}
        </header>
      )}
      {children}
    </section>
  );
}
