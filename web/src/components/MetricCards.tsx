import { AlertTriangle, ArrowDownRight, ArrowUpRight, Clock, MapPin, TrendingUp, Wrench } from "lucide-react";
import type { DashboardMetricsPayload } from "../api/client";

interface Props {
  live: DashboardMetricsPayload | null;
  loading?: boolean;
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}

function fmt1(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

export function MetricCards({ live, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="premium-card animate-pulse rounded-[1.5rem] p-5 h-36" />
        ))}
      </div>
    );
  }

  const k = live?.kpis;
  const windowDays = live?.windowDays ?? 90;

  const metrics = k
    ? [
        {
          label: "Total ATM Failures",
          value: fmtInt(k.totalFailures),
          change: `${k.trendVsPreviousPct >= 0 ? "+" : ""}${fmt1(k.trendVsPreviousPct)}% vs prior ${windowDays}d`,
          isUp: k.trendVsPreviousPct > 0,
          icon: <AlertTriangle className="text-rose-300" size={20} />,
          bg: "from-rose-500/20 to-purple-500/10",
          accent: "text-rose-300",
          detail: `All reasons · last ${windowDays} days · ${live?.source === "postgresql" ? "Neon" : "SQLite"}`,
        },
        {
          label: "Avg. Failures / Day",
          value: fmt1(k.avgFailuresPerDay),
          change: `${k.trendVsPreviousPct >= 0 ? "+" : ""}${fmt1(k.trendVsPreviousPct)}% vs prior`,
          isUp: k.trendVsPreviousPct > 0,
          icon: <TrendingUp className="text-cyan-200" size={20} />,
          bg: "from-cyan-500/20 to-blue-500/10",
          accent: "text-cyan-200",
          detail: `Distinct days with data · ${windowDays}d window`,
        },
        {
          label: "Most Affected City",
          value: k.mostAffectedCity,
          sub: `${fmtInt(k.mostAffectedCityCount)} failures (${fmt1(k.mostAffectedCityPct)}%)`,
          icon: <MapPin className="text-purple-200" size={20} />,
          bg: "from-purple-500/20 to-fuchsia-500/10",
          accent: "text-purple-200",
          detail: "Highest concentration in window",
        },
        {
          label: "MTTR (Avg. Repair Time)",
          value: `${fmt1(k.mttrHours)} hrs`,
          change: k.trendVsPreviousPct <= 0 ? "Stable / improving volume" : "Higher incident load",
          isUp: k.trendVsPreviousPct > 0,
          icon: <Clock className="text-emerald-200" size={20} />,
          bg: "from-emerald-500/20 to-teal-500/10",
          accent: "text-emerald-200",
          detail: "Mean resolution time (all reasons)",
        },
        {
          label: "Hardware Failures (window)",
          value: fmtInt(k.hardwareFailuresInWindow),
          change: "Karachi trend = Hardware",
          isUp: false,
          icon: <Wrench className="text-amber-200" size={20} />,
          bg: "from-amber-500/20 to-orange-500/10",
          accent: "text-amber-200",
          detail: `reason = 'Hardware' · ${windowDays}d`,
        },
      ]
    : [
        {
          label: "Total ATM Failures",
          value: "—",
          change: "Load metrics",
          isUp: true,
          icon: <AlertTriangle className="text-rose-300" size={20} />,
          bg: "from-rose-500/20 to-purple-500/10",
          accent: "text-rose-300",
          detail: "Start the API (port 3001) to load live KPIs",
        },
        {
          label: "Avg. Failures / Day",
          value: "—",
          change: "",
          isUp: false,
          icon: <TrendingUp className="text-cyan-200" size={20} />,
          bg: "from-cyan-500/20 to-blue-500/10",
          accent: "text-cyan-200",
          detail: "Waiting for /api/metrics/dashboard",
        },
        {
          label: "Most Affected City",
          value: "—",
          sub: "",
          icon: <MapPin className="text-purple-200" size={20} />,
          bg: "from-purple-500/20 to-fuchsia-500/10",
          accent: "text-purple-200",
          detail: "",
        },
        {
          label: "MTTR (Avg. Repair Time)",
          value: "—",
          change: "",
          isUp: false,
          icon: <Clock className="text-emerald-200" size={20} />,
          bg: "from-emerald-500/20 to-teal-500/10",
          accent: "text-emerald-200",
          detail: "",
        },
        {
          label: "Hardware Failures (window)",
          value: "—",
          change: "",
          isUp: false,
          icon: <Wrench className="text-amber-200" size={20} />,
          bg: "from-amber-500/20 to-orange-500/10",
          accent: "text-amber-200",
          detail: "",
        },
      ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
      {metrics.map((m, i) => (
        <div key={i} className="premium-card group relative overflow-hidden rounded-[1.5rem] p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/30 hover:shadow-[0_0_36px_rgba(6,182,212,0.12)]">
          <div className={`absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${m.bg} blur-2xl transition group-hover:scale-125`} />
          <div className="flex items-start justify-between mb-4">
            <div className={`rounded-2xl border border-white/10 bg-gradient-to-br ${m.bg} p-2.5 transition-transform group-hover:scale-110`}>
              {m.icon}
            </div>
            {m.change ? (
              <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${m.isUp ? "bg-rose-500/10 text-rose-300" : "bg-emerald-500/10 text-emerald-300"}`}>
                {m.isUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                {m.change}
              </div>
            ) : null}
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-2">{m.label}</div>
          <div className="text-3xl font-bold tracking-tight text-white mb-1">{m.value}</div>
          <div className={`text-[11px] font-medium ${m.accent}`}>{"sub" in m && m.sub ? m.sub : m.detail}</div>
        </div>
      ))}
    </div>
  );
}
