import { useState } from "react";
import { Send, Sparkles, Loader2, MessageSquare } from "lucide-react";
import { useConversation } from "../store/conversation";
import { postQuery } from "../api/client";

export function FollowUpInput() {
  const { loading, conversationId, addUser, addAssistantPending, fulfill, fail } = useConversation();
  const [text, setText] = useState("");

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || loading) return;

    const q = text;
    setText("");
    addUser(q);
    
    const aId = `a-${Date.now()}`;
    addAssistantPending(aId);

    try {
      const res = await postQuery(q, conversationId);
      fulfill(aId, res);
    } catch (err) {
      fail(aId, (err as Error).message);
    }
  };

  return (
    <div className="sticky bottom-6 left-0 right-0 z-10 px-4 md:px-0">
      <div className="max-w-4xl mx-auto">
        <form 
          onSubmit={submit}
          className="relative group p-1 rounded-[2rem] bg-ink-900/40 backdrop-blur-3xl border border-white/10 shadow-2xl transition-all focus-within:border-cyan-300/40 focus-within:ring-4 focus-within:ring-cyan-300/5"
        >
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-cyan-300/50 group-focus-within:text-cyan-300 transition-colors">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <MessageSquare size={18} />}
          </div>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
            placeholder="Ask a follow-up question... (e.g. 'What about last month?' or 'Compare with Lahore')"
            className="w-full h-14 bg-transparent pl-14 pr-16 text-sm text-gray-100 placeholder-gray-500 outline-none"
          />
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-2xl bg-cyan-500 text-ink-950 hover:bg-cyan-400 disabled:opacity-30 disabled:hover:scale-100 transition-all active:scale-95"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
