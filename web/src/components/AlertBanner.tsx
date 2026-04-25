import { AlertTriangle, AlertOctagon, Info } from "lucide-react";

interface Props {
  level: "info" | "warning" | "critical";
  message: string;
}

export function AlertBanner({ level, message }: Props) {
  const styles =
    level === "critical"
      ? "border-bad-500/40 bg-bad-500/10 text-bad-500"
      : level === "warning"
      ? "border-warn-500/40 bg-warn-500/10 text-warn-500"
      : "border-accent-500/40 bg-accent-500/10 text-accent-400";
  const Icon = level === "critical" ? AlertOctagon : level === "warning" ? AlertTriangle : Info;
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${styles}`}>
      <Icon size={16} />
      <span>{message}</span>
    </div>
  );
}
