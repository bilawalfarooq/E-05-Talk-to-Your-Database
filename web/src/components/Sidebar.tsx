import { Activity, Bookmark, Database, LayoutDashboard, Layers, MessageSquare, PlusCircle, Settings } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNewQuery: () => void;
  onOpenSchema: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ activeTab, onTabChange, onNewQuery, onOpenSchema, isOpen, onClose }: SidebarProps) {
  const items = [
    { id: "dashboard", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { id: "new-query", icon: <PlusCircle size={20} />, label: "New Query", action: onNewQuery },
    { id: "conversations", icon: <MessageSquare size={20} />, label: "Conversations" },
    { id: "insights", icon: <Bookmark size={20} />, label: "Saved Insights" },
    { id: "data", icon: <Database size={20} />, label: "Data Sources", action: onOpenSchema },
    { id: "pipeline", icon: <Layers size={20} />, label: "Agent Pipeline" },
    { id: "status", icon: <Activity size={20} />, label: "System Status" },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm xl:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 w-80 p-4 transition-transform duration-300 ease-in-out xl:static xl:flex xl:w-72 xl:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
        }`}>
        <div className="glass relative flex h-full w-full flex-col overflow-hidden rounded-[2rem]">
          <div className="absolute -left-16 top-8 h-36 w-36 rounded-full bg-purple-600/20 blur-3xl" />
          <div className="absolute -bottom-10 right-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-brand flex items-center justify-center glow-purple ring-1 ring-white/15">
                <SparklesIcon className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight text-white">AI Data Copilot</h1>
                <p className="text-[10px] text-cyan-200/70 uppercase tracking-[0.28em] font-bold">for Banks</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-500 hover:text-white xl:hidden"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="relative flex-1 px-4 py-4 space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.action) item.action();
                  else onTabChange(item.id);
                  onClose(); // Close sidebar on mobile after selection
                }}
                className={`group relative w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition ${activeTab === item.id
                    ? "bg-white/[0.07] text-white border border-purple-400/30 shadow-[0_0_28px_rgba(124,58,237,0.18)]"
                    : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04] border border-transparent"
                  }`}
              >
                {activeTab === item.id && <span className="absolute left-2 h-6 w-1 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.9)]" />}
                <span className={`transition ${activeTab === item.id ? "text-cyan-200" : "group-hover:text-cyan-200"}`}>{item.icon}</span>
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="relative p-4 mt-auto">
            <div className="premium-card rounded-3xl p-4">
              <div className="text-[10px] text-gray-500 uppercase tracking-[0.24em] mb-2">Database</div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-good-500 glow-teal soft-pulse" />
                <span className="text-xs font-semibold text-gray-100">Neon PostgreSQL</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-400">
                <span>Banking Records</span>
                <span className="font-mono text-gray-200">2.4M</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full mt-3 overflow-hidden">
                <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
                  <div className="text-gray-500">Latency</div>
                  <div className="font-mono text-cyan-200">38ms</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
                  <div className="text-gray-500">Mode</div>
                  <div className="font-mono text-emerald-200">Read-only</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

import { X } from "lucide-react";

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
