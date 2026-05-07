// History line chart with the predicted point overlaid as a separate marker.

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  Legend,
} from "recharts";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md bg-white border border-slate-200 shadow-sm px-3 py-2 text-xs">
      <p className="font-medium text-slate-900 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          <span className="text-slate-600">{p.name}:</span>{" "}
          <span className="font-medium tabular-nums">
            {p.value?.toLocaleString("en-US", { maximumFractionDigits: 1 })}
          </span>
        </p>
      ))}
    </div>
  );
}

export function ForecastChart({ history, forecast }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-sm text-slate-500 italic h-72 flex items-center justify-center">
        No historical data available for this segment.
      </div>
    );
  }

  // Build chart data: history points have only 'actual', the forecast point
  // has 'forecast' and is appended at the end.
  const chartData = history.map((h) => ({
    month: h.month,
    actual: h.actual,
  }));

  if (forecast) {
    chartData.push({
      month: forecast.target_month,
      actual: null,
      forecast: forecast.prediction,
    });
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1" }}
            interval="preserveStartEnd"
            minTickGap={20}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#cbd5e1" }}
            tickFormatter={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toString()
            }
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            iconType="line"
            wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
          />
          <Line
            type="monotone"
            dataKey="actual"
            name="Actuals"
            stroke="#1d9e75"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
          {forecast && (
            <ReferenceDot
              x={forecast.target_month}
              y={forecast.prediction}
              r={6}
              fill="#0c6349"
              stroke="white"
              strokeWidth={2}
              ifOverflow="visible"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
