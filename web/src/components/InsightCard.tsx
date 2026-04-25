import { Sparkles } from "lucide-react";

interface Props {
  insight: string;
  keyNumbers: string[];
}

export function InsightCard({ insight, keyNumbers }: Props) {
  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-accent-400">
        <Sparkles size={14} />
        Insight
      </div>
      <p className="text-base text-gray-100 leading-relaxed">{insight}</p>
      {keyNumbers.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {keyNumbers.map((k, i) => (
            <li key={i} className="text-xs font-mono px-2 py-1 rounded-md border border-accent-500/30 bg-accent-500/10 text-accent-400">
              {k}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
