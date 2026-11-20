"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { History, Pencil, Play, Plus, Trash2, X } from "lucide-react";
import { listMatters } from "@/app/actions";
import { Section } from "@/components/SettingsKit";
import { kbRequest } from "@/lib/knowledge-api";
import { closeSettings } from "@/lib/settings-modal";
import type { Matter } from "@/lib/types";

type Frequency = "daily" | "weekdays" | "weekly";
type Automation = {
  id: string;
  name: string;
  prompt: string;
  matterId: string | null;
  frequency: Frequency;
  time: string;
  weekday: number;
  schedule: string;
  active: boolean;
  lastRunAt: number | null;
  nextRunAt: number | null;
  lastStatus: "running" | "success" | "error" | null;
};
type Run = { id: string; status: "running" | "success" | "error"; error: string | null; trigger: "schedule" | "manual"; conversationId: string | null; startedAt: number };
type Form = { id: string | null; name: string; prompt: string; frequency: Frequency; time: string; weekday: number; matterId: string };

const EMPTY: Form = { id: null, name: "", prompt: "", frequency: "weekdays", time: "09:00", weekday: 1, matterId: "" };
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const STATUS_LABEL = { running: "Running", success: "Done", error: "Failed" } as const;
const STATUS_COLOUR = { running: "text-foreground/60", success: "text-success", error: "text-destructive" } as const;

const istTime = (ms: number) => new Date(ms).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const fieldClass = "mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-[13.5px] text-foreground outline-none focus:border-brand/60";

/** Prompts that run by themselves on a schedule. Each run opens a chat in the sidebar. */
export default function AutomationsPanel() {
  const [items, setItems] = useState<Automation[] | null>(null);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void kbRequest<{ automations: Automation[] }>("/api/automations").then((res) => {
      if (!mounted.current) return;
      if (res.ok) setItems(res.data.automations);
      else {
        setItems([]);
        setError(res.error);
      }
    });
    void listMatters().then((list) => mounted.current && setMatters(list)).catch(() => undefined);
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = async () => {
    const res = await kbRequest<{ automations: Automation[] }>("/api/automations");
    if (res.ok && mounted.current) setItems(res.data.automations);
  };

  const save = async () => {
    if (!form || saving) return;
    setSaving(true);
    setError("");
    const body = {
      name: form.name,
      prompt: form.prompt,
      frequency: form.frequency,
      time: form.time,
      ...(form.frequency === "weekly" ? { weekday: form.weekday } : {}),
      matterId: form.matterId || null,
    };
    const res = form.id
      ? await kbRequest(`/api/automations/${encodeURIComponent(form.id)}`, { method: "PUT", body })
      : await kbRequest("/api/automations", { method: "POST", body });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    setForm(null);
    await reload();
  };

  const toggle = async (a: Automation) => {
    setError("");
    const res = await kbRequest(`/api/automations/${encodeURIComponent(a.id)}/active`, { method: "POST", body: { active: !a.active } });
    if (!res.ok) return setError(res.error);
    await reload();
  };

  const remove = async (id: string) => {
    setConfirmDelete(null);
    setError("");
    const res = await kbRequest(`/api/automations/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) return setError(res.error);
    if (historyFor === id) setHistoryFor(null);
    await reload();
  };

  const loadRuns = async (id: string) => {
    const res = await kbRequest<{ runs: Run[] }>(`/api/automations/${encodeURIComponent(id)}/runs`);
    if (res.ok && mounted.current) setRuns(res.data.runs);
    return res.ok ? res.data.runs : null;
  };

  const showHistory = async (id: string) => {
    if (historyFor === id) return setHistoryFor(null);
    setHistoryFor(id);
    setRuns(null);
    await loadRuns(id);
  };

  const runNow = async (a: Automation) => {
    setError("");
    setNotice("");
    const res = await kbRequest(`/api/automations/${encodeURIComponent(a.id)}/run`, { method: "POST" });
    if (!res.ok) return setError(res.error);
    setNotice(`“${a.name}” is running. Its chat will appear in your sidebar when it is done.`);
    setHistoryFor(a.id);
    setRuns(null);
    // Check back until the run finishes (up to about two minutes).
    for (let i = 0; i < 60 && mounted.current; i++) {
      await sleep(2000);
      const latest = await loadRuns(a.id);
      if (latest && latest[0]?.status !== "running") break;
    }
    if (mounted.current) {
      setNotice(`“${a.name}” has finished. Open its chat below, or find it in your sidebar.`);
      await reload();
    }
  };

  const edit = (a: Automation) => {
    setError("");
    setForm({ id: a.id, name: a.name, prompt: a.prompt, frequency: a.frequency, time: a.time, weekday: a.weekday, matterId: a.matterId ?? "" });
  };

  const ready = form && form.name.trim() && form.prompt.trim() && /^\d{2}:\d{2}$/.test(form.time);

  return (
    <Section eyebrow="Automation" title="Scheduled prompts" description="Ask Lirava something on a schedule, for example a morning brief of the day's hearings. Each run opens a new chat for you. Times are in Indian Standard Time, and nothing runs more than once a day.">
      <div className="space-y-4">
        {!form && (
          <button type="button" onClick={() => setForm(EMPTY)} className="btn-primary flex h-9 items-center gap-1.5 px-3 text-[13px]">
            <Plus className="size-4" strokeWidth={1.75} />
            New automation
          </button>
        )}

        {form && (
          <form
            className="surface grid gap-3 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-medium">{form.id ? "Edit automation" : "New automation"}</h3>
              <button type="button" onClick={() => setForm(null)} aria-label="Cancel" className="btn-quiet size-7 p-0">
                <X className="size-4" strokeWidth={1.75} />
              </button>
            </div>
            <label className="block text-[12px] text-foreground/60">
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} placeholder="Morning hearing brief" className={fieldClass} />
            </label>
            <label className="block text-[12px] text-foreground/60">
              What to ask
              <textarea
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                maxLength={4000}
                rows={4}
                placeholder="Summarise what is listed for hearing today and what I should prepare."
                className="mt-1 w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-[13.5px] leading-[1.55] text-foreground outline-none placeholder:text-foreground/35 focus:border-brand/60"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-[12px] text-foreground/60">
                How often
                <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as Frequency })} className={fieldClass}>
                  <option value="daily">Every day</option>
                  <option value="weekdays">Every weekday</option>
                  <option value="weekly">Every week</option>
                </select>
              </label>
              {form.frequency === "weekly" && (
                <label className="block text-[12px] text-foreground/60">
                  On
                  <select value={form.weekday} onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })} className={fieldClass}>
                    {WEEKDAYS.map((d, i) => (
                      <option key={d} value={i}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block text-[12px] text-foreground/60">
                At (IST)
                <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className={fieldClass} />
              </label>
            </div>
            <label className="block text-[12px] text-foreground/60">
              Matter (optional)
              <select value={form.matterId} onChange={(e) => setForm({ ...form, matterId: e.target.value })} className={fieldClass}>
                <option value="">None: a general chat each time</option>
                {matters.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center justify-end gap-3">
              {error && (
                <p role="alert" className="mr-auto text-[12.5px] text-destructive">
                  {error}
                </p>
              )}
              <button type="submit" disabled={!ready || saving} className="btn-primary h-9 px-3 text-[13px] disabled:opacity-40">
                {form.id ? "Save changes" : "Create automation"}
              </button>
            </div>
          </form>
        )}

        {!form && error && (
          <p role="alert" className="text-[12.5px] text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="text-[12.5px] text-foreground/70">
            {notice}
          </p>
        )}

        {items === null ? (
          <p className="text-body-sm text-foreground/45">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-body-sm text-foreground/55">No automations yet.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((a) => (
              <li key={a.id} className="surface p-4">
                <div className="flex items-start gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{a.name}</span>
                    <span className="block text-[12.5px] text-foreground/60">{a.schedule}</span>
                    <span className="mt-1 block font-mono text-[11px] text-foreground/50">
                      {a.active && a.nextRunAt ? `Next: ${istTime(a.nextRunAt)}` : "Paused"}
                      {a.lastRunAt ? ` · Last: ${istTime(a.lastRunAt)}` : ""}
                      {a.lastStatus && <span className={`ml-1 ${STATUS_COLOUR[a.lastStatus]}`}>({STATUS_LABEL[a.lastStatus]})</span>}
                    </span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={a.active}
                    aria-label={`${a.name} is ${a.active ? "on" : "paused"}`}
                    onClick={() => void toggle(a)}
                    className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors ${a.active ? "bg-brand" : "bg-highlight"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform ${a.active ? "translate-x-4" : ""}`} />
                  </button>
                </div>
                <p className="mt-2 line-clamp-2 text-[12.5px] text-foreground/55">{a.prompt}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => void runNow(a)} className="btn-quiet flex h-8 items-center gap-1.5 border border-border px-2.5 text-[12.5px]">
                    <Play className="size-3.5" strokeWidth={1.75} />
                    Run now
                  </button>
                  <button type="button" onClick={() => void showHistory(a.id)} aria-expanded={historyFor === a.id} className="btn-quiet flex h-8 items-center gap-1.5 px-2.5 text-[12.5px]">
                    <History className="size-3.5" strokeWidth={1.75} />
                    History
                  </button>
                  <button type="button" onClick={() => edit(a)} className="btn-quiet flex h-8 items-center gap-1.5 px-2.5 text-[12.5px]">
                    <Pencil className="size-3.5" strokeWidth={1.75} />
                    Edit
                  </button>
                  {confirmDelete === a.id ? (
                    <>
                      <span className="ml-auto text-[12px] text-destructive">Delete it and its history?</span>
                      <button type="button" onClick={() => void remove(a.id)} className="btn-quiet h-8 px-2.5 text-[12.5px] text-destructive">
                        Delete
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(null)} className="btn-quiet h-8 px-2.5 text-[12.5px]">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setConfirmDelete(a.id)} aria-label={`Delete ${a.name}`} className="btn-quiet ml-auto size-8 p-0">
                      <Trash2 className="size-3.5" strokeWidth={1.75} />
                    </button>
                  )}
                </div>

                {historyFor === a.id && (
                  <div className="mt-3 border-t border-border pt-3">
                    {runs === null ? (
                      <p className="text-[12.5px] text-foreground/45">Loading…</p>
                    ) : runs.length === 0 ? (
                      <p className="text-[12.5px] text-foreground/55">It has not run yet.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {runs.map((r) => (
                          <li key={r.id} className="flex items-center gap-2 text-[12.5px]">
                            <span className="font-mono text-[11px] text-foreground/55">{istTime(r.startedAt)}</span>
                            <span className="text-foreground/45">{r.trigger === "manual" ? "run by you" : "scheduled"}</span>
                            <span className={STATUS_COLOUR[r.status]} title={r.error ?? undefined}>
                              {STATUS_LABEL[r.status]}
                            </span>
                            {r.conversationId && (
                              <Link href={`/vakil/soli_master?c=${encodeURIComponent(r.conversationId)}`} onClick={closeSettings} className="ml-auto text-brand-readable hover:underline">
                                Open chat
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
