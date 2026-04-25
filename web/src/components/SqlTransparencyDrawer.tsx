import { useState } from "react";
import { ChevronDown, ChevronRight, Code2, Database, Brain, Shield } from "lucide-react";
import type { QueryResponse } from "../api/client";
import { ConfidenceBadge } from "./ConfidenceBadge";

interface Props {
  response: QueryResponse;
}

export function SqlTransparencyDrawer({ response }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-ink-700/30 transition rounded-2xl"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
          <Code2 size={16} className="text-accent-400" />
          AI transparency
          <span className="text-xs text-gray-500">· {response.trace.length} agents · {totalMs(response)}ms</span>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceBadge label={response.validation.combinedLabel} confidence={response.validation.combinedConfidence} />
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4">
          <Section icon={<Database size={14} />} title="Generated SQL">
            <pre className="text-xs font-mono whitespace-pre-wrap text-gray-200 bg-ink-900/80 rounded-lg p-3 border border-ink-700">
              {response.validation.rewrittenSql || response.sqlGen.sql}
            </pre>
            {response.sqlGen.explanation && (
              <p className="mt-2 text-xs text-gray-400 italic">"{response.sqlGen.explanation}"</p>
            )}
          </Section>

          <Section icon={<Brain size={14} />} title="Intent">
            <KV k="Summary" v={response.intent.summary} />
            <KV k="Entities" v={response.intent.entities.join(", ") || "—"} />
            <KV k="Metrics" v={response.intent.metrics.join(", ") || "—"} />
            <KV k="Filters" v={response.intent.filters.join(", ") || "—"} />
            <KV k="Time range" v={response.intent.timeRange.value ?? response.intent.timeRange.type} />
            <KV k="Group by" v={response.intent.groupBy.join(", ") || "—"} />
          </Section>

          <Section icon={<Database size={14} />} title="Schema RAG (top tables)">
            <div className="flex flex-wrap gap-2">
              {response.schemaContext.tables.map((t) => (
                <span key={t.name} className="text-xs font-mono px-2 py-1 rounded-md border border-accent-500/30 bg-accent-500/10 text-accent-400">
                  {t.name} <span className="text-gray-500">· {(t.score * 100).toFixed(0)}%</span>
                </span>
              ))}
            </div>
          </Section>

          <Section icon={<Shield size={14} />} title="Validation">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Rule-based guard</div>
                <ul className="space-y-1 text-xs">
                  {response.validation.guard.checks.map((c, i) => (
                    <li key={i} className={c.passed ? "text-good-500" : "text-bad-500"}>
                      {c.passed ? "✓" : "✗"} {c.name}{c.detail ? ` — ${c.detail}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">ML kNN classifier</div>
                <div className="text-xs">
                  <ConfidenceBadge label={response.validation.classifier.label} confidence={response.validation.classifier.confidence} />
                  <ul className="mt-2 space-y-1 text-xs text-gray-400">
                    {response.validation.classifier.neighbors.slice(0, 3).map((n, i) => (
                      <li key={i} className="truncate">
                        <span className="text-gray-500">{(n.score * 100).toFixed(0)}%</span>{" "}
                        <span className="font-mono text-gray-500">[{n.label}]</span>{" "}
                        <span className="text-gray-400">{n.text.slice(0, 60)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-xs text-gray-500 mt-3 mb-1">LLM judge</div>
                <ConfidenceBadge label={response.validation.judge.label} confidence={response.validation.judge.confidence} />
                <p className="text-xs text-gray-400 italic mt-1">"{response.validation.judge.reason}"</p>
              </div>
            </div>
            {response.validation.explainPlan && (
              <details className="mt-3">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">EXPLAIN QUERY PLAN</summary>
                <pre className="text-xs font-mono whitespace-pre-wrap text-gray-300 bg-ink-900/80 rounded-lg p-2 mt-2 border border-ink-700">
                  {response.validation.explainPlan}
                </pre>
              </details>
            )}
          </Section>

          <Section icon={<Brain size={14} />} title="Agent trace">
            <div className="space-y-1">
              {response.trace.map((t, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-mono w-6">{i + 1}.</span>
                    <span className={t.ok ? "text-gray-200" : "text-bad-500"}>{t.agent}</span>
                    {!t.ok && t.detail && <span className="text-bad-500 italic">{t.detail}</span>}
                  </div>
                  <span className="font-mono text-gray-500">{t.ms}ms</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-400">
        {icon} {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-gray-500 w-20 flex-shrink-0">{k}</span>
      <span className="text-gray-200 font-mono">{v}</span>
    </div>
  );
}

function totalMs(r: QueryResponse): number {
  return r.trace.reduce((acc, t) => acc + t.ms, 0);
}
