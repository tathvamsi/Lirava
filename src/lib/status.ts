import type { Vakil } from "./types";

export function statusLine(vakil: Vakil): string {
  if (vakil.status === "paused") return "Paused";
  if (vakil.status === "waiting") return "Waiting for you";
  if (vakil.status === "working") return vakil.activity ?? "Working";
  return vakil.purpose || "Ready";
}

/** Short uppercase status for mono chrome. */
export function statusLabel(vakil: Vakil): string {
  return { idle: "Ready", working: "Working", waiting: "Needs you", paused: "Paused" }[vakil.status];
}

/** Tailwind classes for the small status vakil. */
export function statusDot(vakil: Vakil): string {
  switch (vakil.status) {
    case "working":
      return "bg-brand text-brand live-dot";
    case "waiting":
      return "bg-warning text-warning";
    case "paused":
      return "bg-foreground/25";
    default:
      return "bg-success/70";
  }
}

export function timeAgo(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
