import { CheckCircle2, Clock3, Loader2, Zap, X } from "lucide-react";
import { useConversation } from "../store/conversation";

interface Props {
  open: boolean;
  onClose: () => void;
}

const demoAgents = [
  "Memory Agent",
  "Intent Agent",
  "Schema Retrieval",
  "SQL Generator",
  "SQL Validator",
  "SQL Executor",
  "Visualization Agent",
  "Explanation Agent",
  "Recommendation Agent",
];

const demoTimes = [42, 65, 118, 230, 84, 156, 92, 176, 139];

export function PipelinePanel({ open, onClose }: Props) {
  const { messages, selectedMessageId, loading } = useConversation();
  const selected = messages.find((m) => m.id === selectedMessageId);
  const response = selected?.response;

  const trace = response?.trace ?? demoAgents.map((agent, i) => ({ agent, ms: demoTimes[i], ok: true }));
  const totalMs = trace.reduce((acc, t) => acc + t.ms, 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 bg-black/60 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-[22rem] h-full bg-ink-900 border-l border-ink-700 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
      <div className="p-6 border-b border-ink-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-300/20 bg-purple-300/10">
              <Zap size={18} className="text-purple-200" />
            </div>
            <div>
              <h2 className="font-bold text-sm uppercase tracking-[0.2em] text-gray-200">AI Agent Pipeline</h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-[0.22em] font-medium">9 specialized agents</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-100">
            <X size={16} />
          </button>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-purple-500 via-cyan-400 to-emerald-400" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="relative">
          <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-purple-500/60 via-cyan-400/50 to-emerald-400/50" />
          
          <div className="space-y-5">
            {trace.map((t, i) => {
              const isLoading = loading && !response && i === 4;
              return (
              <div key={i} className="relative flex gap-4">
                <div className={`z-10 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                  isLoading
                    ? "border-cyan-300 bg-cyan-300/10 text-cyan-200"
                    : t.ok
                      ? "border-emerald-300 bg-emerald-300 text-ink-950 pipeline-flow"
                      : "border-rose-300 bg-rose-300/10 text-rose-200"
                }`}>
                  {isLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold text-gray-100">
                      {t.agent}
                    </span>
                    <span className="text-[10px] font-mono text-cyan-200/80 whitespace-nowrap">{t.ms}ms</span>
                  </div>
                  <p className="flex items-center gap-1.5 text-[10px] text-gray-500 leading-relaxed truncate">
                    <Clock3 size={10} />
                    {isLoading ? "Validating generated SQL..." : t.ok ? "Completed with verified output" : "Needs review"}
                  </p>
                </div>
              </div>
            )})}
          </div>
        </div>
      </div>

        <div className="p-6 border-t border-white/10 bg-white/[0.03]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase font-bold text-gray-500">Total Pipeline Time</span>
            <span className="text-sm font-bold text-cyan-200">{(totalMs / 1000).toFixed(2)}s</span>
          </div>
          <div className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-500 to-cyan-400 flex items-center justify-center gap-2 glow-purple cursor-pointer transition hover:scale-[1.02]">
             <Zap size={16} className="text-white fill-white" />
             <span className="text-xs font-bold text-white uppercase tracking-[0.2em]">Boost Analysis</span>
          </div>
        </div>
      </div>
    </div>
  );
}
