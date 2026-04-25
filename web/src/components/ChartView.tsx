import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HelpCircle } from "lucide-react";
import type { ChartSpec, QueryResponse } from "../api/client";

const PIE_COLORS = ["#7c3aed", "#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

interface Props {
  data: NonNullable<QueryResponse["data"]>;
  chart: ChartSpec;
}

export function ChartView({ data, chart }: Props) {
  const [showReason, setShowReason] = useState(false);

  const records = useMemo(() => {
    return data.rows.map((row) => {
      const obj: Record<string, unknown> = {};
      data.columns.forEach((c, i) => (obj[c] = row[i]));
      return obj;
    });
  }, [data]);

  const isManyBars = records.length > 15;
  const dynamicBarSize = Math.max(8, Math.min(40, Math.floor(900 / Math.max(records.length, 1))));
  const xAxisProps = isManyBars
    ? { angle: -45 as const, textAnchor: "end" as const, interval: 0, tick: { fontSize: 9, fill: "#94a3b8" }, height: 80 }
    : { dy: 12, tick: { fontSize: 11, fill: "#94a3b8" } };

  if (chart.type === "table" || !chart.x || !chart.y) {
    return (
      <div className="py-12 text-center text-gray-500 italic text-sm">
        Tabular data requested. See results table below.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ChartHeader chart={chart} showReason={showReason} setShowReason={setShowReason} />
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === "line" ? (
            <AreaChart data={records} margin={{ top: 10, right: 20, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="colorFailures" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.38}/>
                  <stop offset="55%" stopColor="#7c3aed" stopOpacity={0.16}/>
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 8" stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey={chart.x} stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} dy={12} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#22d3ee", strokeDasharray: "4 4", strokeOpacity: 0.45 }} />
              <Area
                type="monotone"
                dataKey={chart.y}
                stroke="#22d3ee"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorFailures)"
                activeDot={{ r: 7, fill: "#22d3ee", stroke: "#ffffff", strokeWidth: 2 }}
                dot={{ r: 3, fill: "#7c3aed", stroke: "#22d3ee", strokeWidth: 1 }}
              />
            </AreaChart>
          ) : chart.type === "bar" ? (
          <BarChart data={records} margin={{ top: 10, right: 10, left: -20, bottom: isManyBars ? 60 : 0 }}>
              <CartesianGrid strokeDasharray="3 8" stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey={chart.x} stroke="#64748b" tickLine={false} axisLine={false} {...xAxisProps} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey={chart.y} fill="#22d3ee" radius={[6, 6, 0, 0]} barSize={dynamicBarSize} />
            </BarChart>
          ) : (
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Pie data={records} dataKey={chart.y} nameKey={chart.x} outerRadius={100} innerRadius={60} paddingAngle={5}>
                {records.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: "rgba(8, 10, 24, 0.92)",
  border: "1px solid rgba(34, 211, 238, 0.28)",
  borderRadius: 16,
  fontSize: 12,
  color: "#e5e7eb",
  boxShadow: "0 18px 50px rgba(0, 0, 0, 0.34), 0 0 24px rgba(34, 211, 238, 0.12)",
};

function ChartHeader({
  chart, showReason, setShowReason,
}: { chart: ChartSpec; showReason: boolean; setShowReason: (v: boolean) => void }) {
  return (
    <div className="relative flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="px-3 py-1 rounded-full bg-purple-300/10 border border-purple-300/20 text-[10px] font-bold text-purple-100 uppercase tracking-[0.22em]">
          {chart.type}
        </div>
      </div>
      <button
        onClick={() => setShowReason(!showReason)}
        className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-bold text-gray-500 hover:text-cyan-200 transition"
      >
        <HelpCircle size={12} /> Why this chart?
      </button>
      {showReason && (
        <div className="absolute right-0 top-8 max-w-sm rounded-2xl border border-cyan-300/20 bg-ink-900/95 p-4 text-xs text-gray-300 shadow-2xl z-50 backdrop-blur-xl">
          {chart.reason}
        </div>
      )}
    </div>
  );
}
