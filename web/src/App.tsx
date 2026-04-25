import { useEffect, useState } from "react";
import { Database, Sparkles, Zap } from "lucide-react";
import { ChatPanel } from "./components/ChatPanel";
import { ResultDashboard } from "./components/ResultDashboard";
import { SchemaAdminPanel } from "./components/SchemaAdminPanel";
import { getHealth } from "./api/client";

export default function App() {
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [health, setHealth] = useState<{ ok: boolean; mockLlm: boolean; model: string } | null>(null);

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth({ ok: false, mockLlm: true, model: "?" }));
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-3 border-b border-ink-700/60 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-9 h-9 rounded-xl bg-accent-600/20 border border-accent-500/40 text-accent-400 glow">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="text-base font-semibold text-gray-100 leading-tight">AI Data Copilot</div>
            <div className="text-xs text-gray-500 leading-tight">Multi-agent text-to-insight engine for banks</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {health && (
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className={`inline-block w-2 h-2 rounded-full ${health.ok ? "bg-good-500" : "bg-bad-500"}`} />
              <span className="text-gray-400">
                {health.ok ? "API healthy" : "API down"} ·{" "}
                <span className="font-mono">{health.mockLlm ? "MOCK LLM" : health.model}</span>
              </span>
            </div>
          )}
          <button
            onClick={() => setSchemaOpen(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-ink-700 bg-ink-800 text-gray-300 hover:text-accent-400 hover:border-accent-500/50 transition"
          >
            <Database size={14} /> Schema
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent-600 text-white hover:bg-accent-500 transition glow"
          >
            <Zap size={14} /> Demo
          </a>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[420px_1fr] overflow-hidden">
        <aside className="border-r border-ink-700/60 overflow-hidden flex flex-col">
          <ChatPanel />
        </aside>
        <section className="overflow-hidden">
          <ResultDashboard />
        </section>
      </main>

      <SchemaAdminPanel open={schemaOpen} onClose={() => setSchemaOpen(false)} />
    </div>
  );
}
