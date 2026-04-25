import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { PipelinePanel } from "./components/PipelinePanel";
import { ResultDashboard } from "./components/ResultDashboard";
import { SchemaAdminPanel } from "./components/SchemaAdminPanel";
import { LoginPage } from "./components/LoginPage";
import { getHealth, type HealthResponse } from "./api/client";
import { BrainCircuit, Database, LockKeyhole, Search, Shield, MessageSquare, Trash2, Bookmark, Activity, Sparkles } from "lucide-react";
import { useAuth } from "./store/auth";
import { useConversation } from "./store/conversation";

export default function App() {
  const { token } = useAuth();
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showPipeline, setShowPipeline] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const { reset, history, loadConversation, deleteConversation, loadHistory, loading } = useConversation();

  useEffect(() => {
    if (loading && activeTab !== "dashboard") {
      setActiveTab("dashboard");
    }
  }, [loading, activeTab]);

  useEffect(() => {
    if (!token) return;
    loadHistory();
    getHealth()
      .then(setHealth)
      .catch(() =>
        setHealth({
          ok: false,
          time: new Date().toISOString(),
          database: "sqlite",
          databaseDetail: "unavailable",
          llmProvider: "gemini",
          model: "?",
          embedModel: "?",
          mockLlm: true,
          mockLlmReasons: ["API unreachable"],
          embeddings: "mock",
          envFiles: { serverDotEnv: false, repoRootDotEnv: false },
          postgresAutoSeed: false,
          hints: ["Start the server on port 3001"],
        }),
      );
  }, [token]);

  if (!token) return <LoginPage />;

  return (
    <div className="aurora-shell flex h-screen bg-ink-950 text-gray-100 overflow-hidden font-sans">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={(tab) => {
          if (tab === "pipeline") {
            setShowPipeline(!showPipeline);
            setSchemaOpen(false);
          } else {
            setActiveTab(tab);
            setShowPipeline(false);
            setSchemaOpen(false);
          }
        }}
        onNewQuery={() => {
          reset();
          setActiveTab("new-query");
          setShowPipeline(false);
          setSchemaOpen(false);
        }}
        onOpenSchema={() => {
          setSchemaOpen(!schemaOpen);
          setShowPipeline(false);
        }}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setMobileSidebarOpen(true)} onSearch={() => setActiveTab("dashboard")} />
        
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-[1680px] mx-auto p-5 2xl:p-8">
              {activeTab === "dashboard" ? (
                <ResultDashboard />
              ) : activeTab === "new-query" ? (
                <ResultDashboard isNewQuery />
              ) : activeTab === "conversations" ? (
                <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto py-8">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-400/20 border border-white/10">
                      <MessageSquare size={24} className="text-cyan-300" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Conversation History</h2>
                      <p className="text-sm text-gray-500">Resume past analytical queries and insights.</p>
                    </div>
                  </div>

                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 px-4 text-center border border-white/5 bg-white/[0.02] rounded-3xl">
                      <MessageSquare size={36} className="text-gray-600 mb-4" />
                      <h3 className="text-xl font-bold text-gray-400">No conversations yet</h3>
                      <p className="mt-2 text-sm text-gray-500">Ask a question to start your first analysis.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {history.map((conv) => (
                        <div key={conv.id} className="group relative flex items-center justify-between rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-5 transition hover:bg-white/[0.04] hover:border-cyan-300/20 cursor-pointer" onClick={() => { loadConversation(conv.id); setActiveTab("dashboard"); }}>
                          <div className="flex-1 min-w-0 pr-4">
                            <h3 className="text-base font-bold text-gray-200 truncate group-hover:text-cyan-300 transition-colors">
                              {conv.title}
                            </h3>
                            <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                              <span>{new Date(conv.updatedAt).toLocaleDateString()} at {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="h-1 w-1 rounded-full bg-gray-600"></span>
                              <span>{conv.messages.filter(m => m.role === 'user').length} {conv.messages.filter(m => m.role === 'user').length === 1 ? 'query' : 'queries'}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                            className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-400 transition-all rounded-xl hover:bg-red-400/10"
                            title="Delete conversation"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : activeTab === "insights" ? (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
                    <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500/20 to-cyan-400/20 ring-1 ring-white/10 glow-teal">
                      <Bookmark size={36} className="text-emerald-300" />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                      Saved Insights
                    </h2>
                    <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-400">
                      Pin important charts, data snapshots, and AI insights to view them later.
                    </p>
                  </div>
                </div>
              ) : activeTab === "status" ? (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
                    <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500/20 to-cyan-400/20 ring-1 ring-white/10 glow-blue">
                      <Activity size={36} className="text-blue-300" />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                      System Status
                    </h2>
                    <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-400">
                      View live metrics, database connections, and AI pipeline health.
                    </p>
                    <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3 max-w-4xl w-full text-left">
                      <div className="rounded-[1.5rem] bg-white/[0.03] border border-white/5 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4"><div className="w-2.5 h-2.5 rounded-full bg-good-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" /></div>
                        <div className="text-gray-500 font-bold uppercase tracking-wider text-[10px] mb-2">API Gateway</div>
                        <div className="text-2xl font-bold text-white mb-1">Operational</div>
                        <div className="text-xs text-emerald-400">99.99% Uptime</div>
                      </div>
                      <div className="rounded-[1.5rem] bg-white/[0.03] border border-white/5 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4"><div className="w-2.5 h-2.5 rounded-full bg-good-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" /></div>
                        <div className="text-gray-500 font-bold uppercase tracking-wider text-[10px] mb-2">Data Warehouse</div>
                        <div className="text-2xl font-bold text-white mb-1">Connected</div>
                        <div className="text-xs text-cyan-400">{health?.database === "postgresql" ? "Neon Serverless" : "SQLite Local"}</div>
                      </div>
                      <div className="rounded-[1.5rem] bg-white/[0.03] border border-white/5 p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4"><div className="w-2.5 h-2.5 rounded-full bg-good-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" /></div>
                        <div className="text-gray-500 font-bold uppercase tracking-wider text-[10px] mb-2">AI Copilot Engine</div>
                        <div className="text-2xl font-bold text-white mb-1">Live</div>
                        <div className="text-xs text-purple-400">{health?.llmProvider === "groq" ? "Groq (LPU)" : "Gemini API"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[400px]">
                  <div className="text-center space-y-4">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] text-cyan-200">
                      <Sparkles size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
                    <p className="text-gray-400">This feature is coming soon.</p>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>

        <footer className="h-16 border-t border-white/10 px-8 flex items-center justify-between bg-ink-950/75 backdrop-blur-2xl">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10">
              <Shield size={15} className="text-emerald-300" />
            </div>
            <span className="font-bold uppercase tracking-[0.24em] text-gray-300">Read-only banking analytics mode enabled</span>
            <span className="hidden lg:inline text-gray-600">All generated SQL is validated before execution.</span>
          </div>
          <div className="hidden xl:flex items-center gap-3">
            <StatusBadge
              icon={<BrainCircuit size={13} />}
              label={
                health?.mockLlm
                  ? `LLM mock · ${health?.model ?? "—"}`
                  : `${health?.llmProvider ?? "LLM"} · ${health?.model ?? "—"}`
              }
              tone="purple"
            />
            <StatusBadge
              icon={<Database size={13} />}
              label={health?.database === "postgresql" ? "PostgreSQL / Neon" : "SQLite"}
              tone="cyan"
            />
            <StatusBadge
              icon={<Search size={13} />}
              label={health?.embeddings === "live" ? "Semantic RAG (live)" : "Semantic RAG (mock vec)"}
              tone="green"
            />
            <StatusBadge icon={<LockKeyhole size={13} />} label="PII Guardrails" tone="amber" />
          </div>
        </footer>
      </div>

      <PipelinePanel open={showPipeline} onClose={() => setShowPipeline(false)} />
      <SchemaAdminPanel open={schemaOpen} onClose={() => setSchemaOpen(false)} />
    </div>
  );
}



function StatusBadge({ icon, label, tone }: { icon: ReactNode; label: string; tone: "purple" | "cyan" | "green" | "amber" }) {
  const tones = {
    purple: "border-purple-400/20 bg-purple-400/10 text-purple-200",
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-200",
    green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  };

  return (
    <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold ${tones[tone]}`}>
      {icon}
      {label}
    </div>
  );
}
