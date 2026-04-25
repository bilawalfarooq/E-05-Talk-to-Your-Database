import { CalendarDays, ChevronDown, Download, FileDown, Lightbulb, Sparkles, TrendingUp, Loader2, Database } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useConversation } from "../store/conversation";
import { ChartView } from "./ChartView";
import { AlertBanner } from "./AlertBanner";
import { MetricCards } from "./MetricCards";
import { FollowUpInput } from "./FollowUpInput";
import { MessageSquare, ArrowRight } from "lucide-react";
import { getDashboardMetrics, type ChartSpec, type DashboardMetricsPayload, type QueryResponse } from "../api/client";

const demoData: NonNullable<QueryResponse["data"]> = {
  columns: ["date", "failures"],
  rows: [
    ["Jul 01", 8],
    ["Jul 08", 12],
    ["Jul 15", 10],
    ["Jul 22", 18],
    ["Jul 29", 21],
    ["Aug 05", 17],
    ["Aug 12", 26],
    ["Aug 19", 23],
    ["Aug 26", 31],
    ["Sep 02", 29],
    ["Sep 09", 37],
    ["Sep 16", 33],
  ],
  rowCount: 1248,
  durationMs: 284,
};

const demoChart: ChartSpec = {
  type: "line",
  x: "date",
  y: "failures",
  reason: "A time-series line chart best reveals the acceleration in Karachi ATM hardware failures across the last 90 days.",
};

const demoRows = [
  ["F-10831", "ATM-KHI-221", "Clifton Block 5", "Card reader jam", "2025-09-16", "6h 20m"],
  ["F-10828", "ATM-KHI-118", "Gulshan-e-Iqbal", "Dispenser fault", "2025-09-15", "4h 10m"],
  ["F-10819", "ATM-KHI-077", "Saddar", "Power module", "2025-09-14", "8h 45m"],
  ["F-10804", "ATM-KHI-144", "DHA Phase 6", "Thermal printer", "2025-09-13", "2h 55m"],
  ["F-10792", "ATM-KHI-063", "North Nazimabad", "Cash cassette", "2025-09-12", "5h 35m"],
  ["F-10781", "ATM-KHI-190", "Korangi", "Network interface", "2025-09-11", "3h 25m"],
];

const defaultInsight =
  "ATM hardware failures in Karachi are trending upward, with the steepest rise around high-traffic commercial zones. The pattern suggests recurring component stress rather than isolated incidents.";
const defaultKeyNumbers = [
  "1,248 total failures in 90 days",
  "Karachi contributes 66.7% of all reported hardware failures",
  "Peak weekly failure count reached 37 incidents",
];

export function ResultDashboard({ isNewQuery }: { isNewQuery?: boolean }) {
  const { messages, selectedMessageId } = useConversation();
  const selected = messages.find((m) => m.id === selectedMessageId);
  const response = selected?.response;

  const [dash, setDash] = useState<DashboardMetricsPayload | null>(null);
  const [dashLoading, setDashLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setDashLoading(true);
    getDashboardMetrics()
      .then((d) => {
        if (!cancelled) setDash(d);
      })
      .catch(() => {
        if (!cancelled) setDash(null);
      })
      .finally(() => {
        if (!cancelled) setDashLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const liveChartData = useMemo((): NonNullable<QueryResponse["data"]> | null => {
    if (!dash?.karachiHardwareTrend?.rows?.length) return null;
    const rows = dash.karachiHardwareTrend.rows.map((r) => [String(r[0] ?? ""), Number(r[1] ?? 0)]);
    return {
      columns: ["day", "failures"],
      rows,
      rowCount: dash.kpis.totalFailures,
      durationMs: 0,
    };
  }, [dash]);

  const liveChartSpec: ChartSpec = useMemo(
    () => ({
      type: "line",
      x: "day",
      y: "failures",
      reason: "Daily counts of Hardware ATM failures in Karachi from the live warehouse (last 90 days).",
    }),
    [],
  );

  // Priority: AI response chart > live dashboard chart > demo fallback
  const chartData = response?.data ?? liveChartData ?? demoData;
  const chartSpec = (response?.chart && response.chart.type !== "table")
    ? response.chart
    : response?.chart?.type === "table"
      ? response.chart  // keep table so ChartView shows the "see table below" message
      : liveChartData
        ? liveChartSpec
        : demoChart;

  const keyNumbersFromDash = dash
    ? [
        `${dash.kpis.totalFailures.toLocaleString()} ATM failures in last ${dash.windowDays} days (all reasons)`,
        `${dash.kpis.mostAffectedCity}: ${dash.kpis.mostAffectedCityCount.toLocaleString()} failures (${dash.kpis.mostAffectedCityPct.toFixed(1)}% of window)`,
        `${dash.kpis.hardwareFailuresInWindow.toLocaleString()} hardware failures in window · MTTR ${dash.kpis.mttrHours.toFixed(2)} hrs`,
      ]
    : null;

  const insight = response?.explanation?.insight ?? defaultInsight;
  const keyNumbers = response?.explanation?.keyNumbers ?? keyNumbersFromDash ?? defaultKeyNumbers;
  const recommendation =
    response?.recommendation?.recommendation ??
    "Prioritize preventive maintenance for card readers and dispenser modules across Clifton, Saddar, and Gulshan clusters. Shift technician coverage toward evening windows where downtime impact is highest.";
  const action = response?.recommendation?.action ?? "Create maintenance optimization plan";

  const windowDays = dash?.windowDays ?? 90;
  const rangeLabel = dash?.loadedAt
    ? new Date(dash.loadedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—";

  const tableRows =
    response?.data && response.data.rows.length > 0
      ? response.data.rows
      : dash?.recentFailures?.rows?.length
        ? dash.recentFailures.rows.map((r) => r.map((c) => c))
        : demoRows;
  const tableTotal = response?.data?.rowCount ?? dash?.kpis.totalFailures ?? 1248;

  const userMessageIndex = messages.findIndex((m) => m.id === selectedMessageId) - 1;
  const userMessage = userMessageIndex >= 0 ? messages[userMessageIndex] : null;
  const queryText = userMessage?.text ?? response?.query ?? "ATM Hardware Failures Trend - Karachi";

  if (selected?.loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-300/20 bg-purple-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-purple-200">
              <Loader2 size={13} className="animate-spin" />
              Agent Pipeline Active
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              {userMessage?.text ?? "Processing your question..."}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">
              The AI copilot is translating your request, validating SQL, and gathering insights...
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8 space-y-6">
            <div className="premium-card neon-border rounded-[2rem] p-5 md:p-6 h-[400px] flex items-center justify-center relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-cyan-400/5 animate-pulse" />
               <div className="flex flex-col items-center justify-center relative z-10 text-cyan-200/50">
                 <Loader2 size={40} className="animate-spin mb-4" />
                 <div className="font-mono text-sm tracking-widest uppercase">Executing Query Pipeline</div>
               </div>
            </div>
            <div className="premium-card rounded-[2rem] p-5 h-[250px] animate-pulse bg-white/[0.02]" />
          </div>
          <div className="xl:col-span-4 space-y-6">
            <div className="premium-card rounded-[2rem] p-5 h-[200px] animate-pulse bg-white/[0.02]" />
            <div className="premium-card rounded-[2rem] p-5 h-[200px] animate-pulse bg-white/[0.02]" />
          </div>
        </div>
      </div>
    );
  }

  if (isNewQuery && messages.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500/20 to-cyan-400/20 ring-1 ring-white/10 glow-purple">
            <Sparkles size={36} className="text-cyan-300" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            What would you like to know?
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-400">
            Ask questions about your banking data in plain English. The AI Copilot will generate SQL, execute it against your database, and provide visual insights.
          </p>
          <div className="mt-8 flex items-center gap-2 text-sm text-cyan-200/70">
            <ChevronDown size={16} className="animate-bounce" />
            <span>Type a question in the search bar above to begin</span>
            <ChevronDown size={16} className="animate-bounce" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      {/* Conversation Thread / Breadcrumbs */}
      {messages.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto py-2 custom-scrollbar no-scrollbar scroll-smooth">
          {messages.map((m, i) => m.role === 'user' && (
            <div key={m.id} className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => select(messages[messages.findIndex(x => x.id === m.id) + 1]?.id || m.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-medium border transition-all ${
                  (selectedMessageId === m.id || messages[messages.findIndex(x => x.id === m.id) + 1]?.id === selectedMessageId)
                    ? 'bg-cyan-500/10 border-cyan-400/30 text-cyan-200' 
                    : 'bg-white/[0.02] border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10'
                }`}
              >
                {m.text}
              </button>
              {i < messages.length - 2 && <ArrowRight size={12} className="text-gray-700" />}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-200">
            <Sparkles size={13} />
            Real-time AI banking analytics
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
            {queryText}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">
            Natural language question converted into governed SQL, visual analysis, and executive-ready recommendations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-400 px-4 py-3 text-xs font-bold text-white shadow-[0_0_28px_rgba(124,58,237,0.26)] transition hover:scale-105">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {response?.alert && <AlertBanner level={response.alert.level} message={response.alert.message} />}

      {response?.blocked ? (
        <div className="rounded-2xl border border-bad-500/40 bg-bad-500/10 p-6">
          <div className="text-lg font-bold text-bad-500 mb-2">Query Blocked</div>
          <div className="text-sm text-gray-300">{response.blockedReason}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8 space-y-6">
            <div className="premium-card neon-border rounded-[2rem] p-5 md:p-6">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{queryText}</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {liveChartData && !response?.data
                      ? `Live series from ${dash?.source === "postgresql" ? "Neon PostgreSQL" : "SQLite"} (Hardware · ${windowDays}d)`
                      : "Daily aggregation from governed read-only banking warehouse"}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 soft-pulse" />
                  Live tooltip enabled
                </div>
              </div>
              <ChartView data={chartData} chart={chartSpec} />
            </div>

            <ResultsTable columns={response?.data?.columns} rows={tableRows} totalApprox={tableTotal} source={dash?.source} />
          </div>

          <div className="xl:col-span-4 space-y-6">
            <InsightPanel title="AI Insight" icon={<Sparkles size={18} />} tone="purple">
              <p className="text-sm leading-7 text-gray-300">
                {highlightInsight(insight)}
              </p>
              <div className="mt-5 space-y-2">
                {keyNumbers.map((k, i) => (
                  <div key={i} className="rounded-2xl border border-purple-300/10 bg-purple-300/5 px-3 py-2 text-xs font-medium text-purple-100">
                    {k}
                  </div>
                ))}
              </div>
            </InsightPanel>

            <InsightPanel title="Recommendation" icon={<Lightbulb size={18} />} tone="cyan">
              <p className="text-sm leading-7 text-gray-300">{recommendation}</p>
              <button className="mt-5 w-full rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-300/20">
                {action}
              </button>
            </InsightPanel>

            <InsightPanel title="Generated SQL" icon={<Database size={18} />} tone="purple">
              <div className="rounded-xl bg-black/40 p-3 overflow-x-auto border border-white/5 custom-scrollbar">
                <pre className="text-[11px] leading-relaxed text-purple-200/90 font-mono">
                  {response?.sqlGen?.sql ?? "SELECT date(failed_at) AS day, COUNT(*) AS failures\nFROM atm_failures\nGROUP BY 1\nORDER BY day"}
                </pre>
              </div>
            </InsightPanel>

            <div className="premium-card rounded-[2rem] p-5">
              <div className="mb-5 flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-200" />
                <h3 className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Query Summary</h3>
              </div>
              <div className="space-y-4">
                <StatRow label="Rows Returned" value={chartData.rowCount.toLocaleString()} />
                <StatRow label="Date Range" value={`Last ${windowDays} days`} />
                <StatRow
                  label="Data Source"
                  value={response?.schemaContext.tables[0]?.name || (dash?.source === "postgresql" ? "postgresql / atm_failures" : "atm_failures")}
                />
                <StatRow label="Execution Time" value={`${response ? (response.trace.reduce((a,b) => a+b.ms, 0)/1000).toFixed(2) : "1.42"}s`} />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Sticky follow-up input */}
      <FollowUpInput />
    </div>
  );
}

function StatRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-3 last:border-0 last:pb-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-bold text-gray-200">{value}</span>
    </div>
  );
}

function InsightPanel({ title, icon, tone, children }: { title: string; icon: ReactNode; tone: "purple" | "cyan"; children: ReactNode }) {
  const toneClass = tone === "purple" ? "text-purple-200 bg-purple-300/10 border-purple-300/20" : "text-cyan-200 bg-cyan-300/10 border-cyan-300/20";
  return (
    <div className="premium-card rounded-[2rem] p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${toneClass}`}>
          {icon}
        </div>
        <h3 className="text-xs font-bold uppercase tracking-[0.24em] text-gray-400">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ResultsTable({
  columns,
  rows,
  totalApprox,
  source,
}: {
  columns?: string[];
  rows: unknown[][];
  totalApprox: number;
  source?: "postgresql" | "sqlite";
}) {
  const displayColumns = columns && columns.length > 0 ? columns : ["ID", "ATM ID", "Location", "Failure Type", "Date", "Downtime"];
  
  const normalizedRows = rows.map((row, index) => {
    if (columns && columns.length > 0) {
      return row;
    }
    return row.length >= 6 ? row : demoRows[index % demoRows.length];
  });

  return (
    <div className="premium-card rounded-[2rem] p-5">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-gray-400">Query Results</h3>
          <p className="mt-1 text-xs text-gray-600">
            {source === "postgresql"
              ? "Data fetched from PostgreSQL (Neon)"
              : "Top records from validated SQL or live warehouse preview"}
          </p>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar rounded-xl border border-white/5">
        <table className="w-full text-left text-sm relative">
          <thead className="bg-ink-950 sticky top-0 z-10 shadow-sm shadow-black/50">
            <tr className="text-[10px] uppercase tracking-[0.22em] text-gray-500 bg-white/[0.04]">
              {displayColumns.map((c, i) => <th key={`${c}-${i}`} className="px-4 py-3 font-bold">{c}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-gray-300 bg-black/20">
            {normalizedRows.map((row, i) => (
              <tr key={i} className="transition hover:bg-cyan-300/[0.04]">
                {row.map((v, j) => <td key={j} className="px-4 py-3 font-mono text-xs">{String(v)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function highlightInsight(text: string) {
  // Dynamically highlight: numbers with commas/%, city names, and key analytical words
  const highlightRe = /(\d[\d,\.]*%?|\$[\d,\.]+|\b(?:Karachi|Lahore|Islamabad|Faisalabad|Multan|Peshawar|Rawalpindi|Quetta)\b|\b(?:highest|lowest|top|critical|significant|increase|decrease|upward|downward|peak|surge|drop|trend|risk)\b)/gi;
  const parts = text.split(highlightRe);

  return (
    <>
      {parts.map((part, i) =>
        highlightRe.test(part) ? (
          <span key={i} className="rounded-md bg-cyan-300/10 px-1.5 py-0.5 font-semibold text-cyan-100">{part}</span>
        ) : (
          part
        ),
      )}
    </>
  );
}
