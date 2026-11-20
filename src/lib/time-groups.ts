/** Buckets chats by recency for the sidebar: Today, Yesterday, Previous 7 days, Previous 30 days, then by month. */
export function timeGroupLabel(ts: number, now = Date.now()): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(new Date(now));
  const day = 24 * 60 * 60 * 1000;
  if (ts >= today) return "Today";
  if (ts >= today - day) return "Yesterday";
  if (ts >= today - 7 * day) return "Previous 7 days";
  if (ts >= today - 30 * day) return "Previous 30 days";
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return d.toLocaleDateString("en-IN", sameYear ? { month: "long" } : { month: "long", year: "numeric" });
}

/** Groups already-sorted (newest first) items, keeping first-seen group order. */
export function groupByTime<T extends { updatedAt: number }>(items: T[], now = Date.now()): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const label = timeGroupLabel(item.updatedAt, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}
