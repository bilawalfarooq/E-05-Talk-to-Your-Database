import { Lightbulb, ArrowRight } from "lucide-react";

interface Props {
  recommendation: string;
  action: string;
}

export function RecommendationCard({ recommendation, action }: Props) {
  return (
    <div className="rounded-2xl p-4 border border-good-500/30 bg-good-500/10 space-y-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-good-500">
        <Lightbulb size={14} />
        Recommended action
      </div>
      <p className="text-sm text-gray-100 leading-relaxed">{recommendation}</p>
      <button className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-good-500/20 text-good-500 border border-good-500/40 hover:bg-good-500/30 transition">
        {action}
        <ArrowRight size={12} />
      </button>
    </div>
  );
}
