export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatPercentage(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

export function getStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === "running" || s === "active" || s === "online") return "#22c55e"; // green
  if (s === "idle" || s === "standby") return "#eab308"; // yellow
  if (s === "maintenance" || s === "breakdown" || s === "offline") return "#ef4444"; // red
  return "#64748b"; // default slate
}

export function getPriorityColor(priority: string): string {
  const p = priority.toLowerCase();
  if (p === "high" || p === "critical") return "text-red-500 bg-red-500/10 border-red-500/20";
  if (p === "medium" || p === "warning") return "text-amber-500 bg-amber-500/10 border-amber-500/20";
  if (p === "low" || p === "info") return "text-green-500 bg-green-500/10 border-green-500/20";
  return "text-blue-500 bg-blue-500/10 border-blue-500/20";
}
