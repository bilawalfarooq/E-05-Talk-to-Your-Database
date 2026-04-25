import { useMemo, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { HelpCircle } from "lucide-react";
import type { ChartSpec, QueryResponse } from "../api/client";

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];

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

  if (chart.type === "table" || !chart.x || !chart.y) {
    return (
      <div className="space-y-3">
        <ChartHeader chart={chart} showReason={showReason} setShowReason={setShowReason} />
        <DataTable data={data} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ChartHeader chart={chart} showReason={showReason} setShowReason={setShowReason} />
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === "line" ? (
            <LineChart data={records} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey={chart.x} stroke="#9ca3af" tick={{ fontSize: 11 }} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey={chart.y} stroke="#818cf8" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          ) : chart.type === "bar" ? (
            <BarChart data={records} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey={chart.x} stroke="#9ca3af" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey={chart.y} fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Pie data={records} dataKey={chart.y} nameKey={chart.x} outerRadius={100} label>
                {records.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
      <DataTable data={data} compact />
    </div>
  );
}

const tooltipStyle = {
  background: "#0b0f19",
  border: "1px solid #1f2937",
  borderRadius: 8,
  fontSize: 12,
  color: "#e5e7eb",
};

function ChartHeader({
  chart, showReason, setShowReason,
}: { chart: ChartSpec; showReason: boolean; setShowReason: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400">
        <span>Chart</span>
        <span className="rounded-md bg-accent-500/15 text-accent-400 px-2 py-0.5 font-mono">{chart.type}</span>
      </div>
      <button
        onClick={() => setShowReason(!showReason)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-accent-400 transition"
        title="Why this chart?"
      >
        <HelpCircle size={14} />
        Why this chart?
      </button>
      {showReason && (
        <div className="absolute right-6 mt-10 max-w-sm rounded-lg border border-accent-500/30 bg-ink-800 p-3 text-xs text-gray-300 shadow-lg z-10">
          {chart.reason}
        </div>
      )}
    </div>
  );
}

function DataTable({ data, compact = false }: { data: NonNullable<QueryResponse["data"]>; compact?: boolean }) {
  if (data.rowCount === 0) return <div className="text-sm text-gray-500 italic">No rows.</div>;
  const limit = compact ? 8 : 50;
  const visible = data.rows.slice(0, limit);
  return (
    <div className="overflow-x-auto rounded-xl border border-ink-700 bg-ink-800/40">
      <table className="min-w-full text-sm">
        <thead className="bg-ink-700/60 text-gray-400 text-xs uppercase">
          <tr>{data.columns.map((c) => <th key={c} className="px-3 py-2 text-left font-medium">{c}</th>)}</tr>
        </thead>
        <tbody>
          {visible.map((row, i) => (
            <tr key={i} className="border-t border-ink-700/60 hover:bg-ink-700/30">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 font-mono text-xs text-gray-200">
                  {formatCell(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.rowCount > limit && (
        <div className="px-3 py-2 text-xs text-gray-500 border-t border-ink-700/60">
          Showing {limit} of {data.rowCount} rows
        </div>
      )}
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return Number.isInteger(v) ? v.toLocaleString() : v.toFixed(2);
  return String(v);
}
