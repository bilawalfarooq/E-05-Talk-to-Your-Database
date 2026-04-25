import { useEffect, useRef, useState } from "react";
import { Send, RotateCcw } from "lucide-react";
import { useConversation } from "../store/conversation";
import { postQuery } from "../api/client";
import { MessageBubble } from "./MessageBubble";
import { VoiceInputButton } from "./VoiceInputButton";
import { SuggestedQueries } from "./SuggestedQueries";

export function ChatPanel() {
  const { messages, conversationId, loading, selectedMessageId, addUser, addAssistantPending, fulfill, fail, select, reset } =
    useConversation();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, loading]);

  const submit = async (q: string) => {
    if (!q.trim() || loading) return;
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
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-700/60">
        <div>
          <div className="text-sm font-semibold text-gray-100">Conversation</div>
          <div className="text-xs text-gray-500 font-mono">{conversationId}</div>
        </div>
        <button
          onClick={reset}
          title="New conversation"
          className="p-1.5 rounded-lg border border-ink-700 bg-ink-800 text-gray-400 hover:text-accent-400 hover:border-accent-500/50 transition"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {messages.length === 0 && (
          <div className="px-3 py-6 text-center">
            <div className="text-2xl font-semibold text-gray-100">Ask anything about the bank.</div>
            <div className="text-sm text-gray-500 mt-2">
              Powered by 9 collaborating AI agents — Intent, Schema RAG, SQL Gen, ML Validator, Executor, Visualization, Explanation, Recommendation, Memory.
            </div>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            selected={selectedMessageId === m.id}
            onClick={() => m.response && select(m.id)}
          />
        ))}
      </div>

      <div className="border-t border-ink-700/60 p-3 space-y-3">
        <SuggestedQueries onPick={(q) => submit(q)} disabled={loading} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(text);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(text);
              }
            }}
            rows={2}
            placeholder="e.g. ATM failures trend in the last 90 days"
            className="flex-1 resize-none rounded-xl border border-ink-700 bg-ink-800/70 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-accent-500/60 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
            disabled={loading}
          />
          <VoiceInputButton onResult={(t) => setText(t)} disabled={loading} />
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="p-2.5 rounded-xl bg-accent-600 text-white hover:bg-accent-500 disabled:opacity-50 disabled:cursor-not-allowed transition glow"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
