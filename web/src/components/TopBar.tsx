import { Bell, Command, Send, Sparkles, Menu, LogOut } from "lucide-react";
import { useState } from "react";
import { useConversation } from "../store/conversation";
import { postQuery } from "../api/client";
import { useAuth } from "../store/auth";

interface TopBarProps {
  onMenuClick?: () => void;
  onSearch?: () => void;
}

export function TopBar({ onMenuClick, onSearch }: TopBarProps) {
  const { loading, reset } = useConversation();
  const { user, logout } = useAuth();
  const [text, setText] = useState("");

  const submit = async (q: string) => {
    if (!q.trim() || useConversation.getState().loading) return;
    
    reset();
    setText("");
    onSearch?.();
    
    const { addUser, addAssistantPending, fulfill, fail, conversationId } = useConversation.getState();
    
    addUser(q);
    const aId = `a-${Date.now()}`;
    addAssistantPending(aId);
    
    try {
      const res = await postQuery(q, conversationId);
      useConversation.getState().fulfill(aId, res);
    } catch (err) {
      useConversation.getState().fail(aId, (err as Error).message);
    }
  };

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  return (
    <header className="h-24 bg-ink-950/35 backdrop-blur-2xl border-b border-white/10 px-5 2xl:px-8 flex items-center justify-between gap-4 z-20">
      <button 
        onClick={onMenuClick}
        className="xl:hidden p-2 -ml-2 rounded-xl text-gray-400 hover:text-white"
      >
        <Menu size={24} />
      </button>
      <div className="flex-1 max-w-5xl relative group">
        <form 
          onSubmit={(e) => { e.preventDefault(); submit(text); }}
          className="relative w-full"
        >
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-cyan-200/80 group-focus-within:text-white transition-colors">
            <Sparkles size={20} />
          </div>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask anything like: Show ATM failures in Karachi last 90 days"
            className="w-full h-16 rounded-[1.35rem] border border-white/12 bg-white/[0.06] pl-14 pr-20 text-[15px] text-gray-100 placeholder-gray-500 shadow-2xl shadow-purple-950/20 outline-none backdrop-blur-xl transition-all focus:border-cyan-300/50 focus:ring-4 focus:ring-cyan-300/10"
            disabled={loading}
          />
          <div className="pointer-events-none absolute bottom-2.5 left-14 hidden items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-gray-600 lg:flex">
            <Command size={11} />
            <span>Natural Language to SQL + Insight</span>
          </div>
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-400 p-3.5 text-white shadow-[0_0_28px_rgba(124,58,237,0.36)] transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden md:flex items-center gap-3 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2">
          <div className="w-2.5 h-2.5 rounded-full bg-good-500 animate-pulse shadow-[0_0_16px_rgba(16,185,129,0.9)]" />
          <span className="text-[10px] uppercase tracking-[0.24em] text-emerald-200 font-bold">System Live</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-gray-400 hover:text-white transition"
            >
              <Bell size={18} />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
            </button>
            
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 top-full mt-3 w-80 rounded-[1.5rem] border border-white/10 bg-ink-900/95 p-4 shadow-2xl backdrop-blur-xl z-50 animate-in slide-in-from-top-2">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Notifications</h3>
                    <span className="text-[10px] text-cyan-300 uppercase tracking-wider cursor-pointer">Mark all read</span>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-xl bg-white/[0.03] p-3 text-xs border border-white/5">
                      <div className="font-bold text-gray-200 mb-1">New Data Sync</div>
                      <div className="text-gray-400">Neon PostgreSQL database sync completed successfully.</div>
                      <div className="mt-2 text-[10px] text-gray-500">2 mins ago</div>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] p-3 text-xs border border-white/5">
                      <div className="font-bold text-gray-200 mb-1">System Alert</div>
                      <div className="text-gray-400">High latency detected in vector embeddings.</div>
                      <div className="mt-2 text-[10px] text-gray-500">1 hour ago</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 transition hover:bg-white/[0.08]"
            >
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-gray-100">{user?.name ?? "User"}</div>
                <div className="text-[10px] text-cyan-200/70">{user?.role ?? "Analyst"}</div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-800 to-purple-900 border border-white/15 flex items-center justify-center text-cyan-100 font-bold shadow-lg">
                {user?.avatar ?? "U"}
              </div>
            </button>

            {showProfile && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                <div className="absolute right-0 top-full mt-3 w-64 rounded-[1.5rem] border border-white/10 bg-ink-900/95 p-3 shadow-2xl backdrop-blur-xl z-50 animate-in slide-in-from-top-2">
                  <div className="p-3 border-b border-white/10 mb-2">
                    <div className="text-sm font-bold text-white">{user?.name ?? "User"}</div>
                    <div className="text-xs text-gray-400">{user?.email ?? ""}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-purple-300">{user?.role}</div>
                  </div>
                  <div className="space-y-1">
                    <button className="w-full rounded-xl px-4 py-2.5 text-left text-xs font-medium text-gray-300 hover:bg-white/[0.05] hover:text-white transition">
                      Account Settings
                    </button>
                    <button className="w-full rounded-xl px-4 py-2.5 text-left text-xs font-medium text-gray-300 hover:bg-white/[0.05] hover:text-white transition">
                      API Keys
                    </button>
                    <button
                      onClick={() => { setShowProfile(false); logout(); }}
                      className="w-full flex items-center gap-2 rounded-xl px-4 py-2.5 text-left text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition mt-2"
                    >
                      <LogOut size={13} /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
