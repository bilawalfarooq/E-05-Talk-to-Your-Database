interface Props {
  label: string;
  confidence: number;
}

const COLORS: Record<string, string> = {
  safe: "bg-good-500/20 text-good-500 border-good-500/40",
  inefficient: "bg-warn-500/20 text-warn-500 border-warn-500/40",
  ambiguous: "bg-warn-500/20 text-warn-500 border-warn-500/40",
  dangerous: "bg-bad-500/20 text-bad-500 border-bad-500/40",
};

export function ConfidenceBadge({ label, confidence }: Props) {
  const color = COLORS[label] ?? "bg-ink-700 text-gray-300 border-ink-600";
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded-md border ${color}`}>
      {label} · {(confidence * 100).toFixed(0)}%
    </span>
  );
}
