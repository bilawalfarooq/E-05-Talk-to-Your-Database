import { Sparkles } from "lucide-react";

const SUGGESTIONS = [
  "ATM failures trend in the last 90 days",
  "Top 5 branches by transaction volume this month",
  "Distribution of ATM failure reasons in Karachi",
  "High-value transactions over 1M PKR in last 7 days",
  "Which customer segment opens the most savings accounts?",
];

interface Props {
  onPick: (q: string) => void;
  disabled?: boolean;
}

export function SuggestedQueries({ onPick, disabled }: Props) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 mb-2">
        <Sparkles size={12} /> Try asking
      </div>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            disabled={disabled}
            onClick={() => onPick(s)}
            className="text-xs px-3 py-1.5 rounded-full border border-ink-700 bg-ink-800/60 text-gray-300 hover:text-accent-400 hover:border-accent-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
