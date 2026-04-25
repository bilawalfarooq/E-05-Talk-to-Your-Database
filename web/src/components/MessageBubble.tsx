import { Bot, User, Loader2 } from "lucide-react";
import type { ChatMessage } from "../store/conversation";
import { ConfidenceBadge } from "./ConfidenceBadge";

interface Props {
  message: ChatMessage;
  selected?: boolean;
  onClick?: () => void;
}

export function MessageBubble({ message, selected, onClick }: Props) {
  const isUser = message.role === "user";
  return (
    <div
      onClick={onClick}
      className={`flex gap-3 px-3 py-3 rounded-2xl cursor-pointer transition ${
        selected ? "bg-accent-500/10 border border-accent-500/30" : "hover:bg-ink-800/50"
      }`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full grid place-items-center ${
        isUser ? "bg-accent-500/20 text-accent-400" : "bg-ink-700 text-gray-300"
      }`}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 mb-1">{isUser ? "You" : "Copilot"}</div>
        {message.loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 size={14} className="animate-spin text-accent-400" />
            <span className="shimmer bg-clip-text text-transparent">Thinking through 9 agents…</span>
          </div>
        ) : message.error ? (
          <div className="text-sm text-bad-500">{message.text}</div>
        ) : (
          <div className="text-sm text-gray-100 leading-relaxed">{message.text || (isUser ? "" : "(no answer)")}</div>
        )}
        {message.response && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <ConfidenceBadge label={message.response.validation.combinedLabel} confidence={message.response.validation.combinedConfidence} />
            <span className="text-[10px] uppercase tracking-wide text-gray-500">
              {message.response.data?.rowCount ?? 0} rows · {message.response.trace.reduce((a, t) => a + t.ms, 0)}ms
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
