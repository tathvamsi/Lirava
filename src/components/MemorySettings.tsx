"use client";

import { useEffect, useState } from "react";
import { Brain, Check, Pencil, Trash2, X } from "lucide-react";

type Memory = { id: string; content: string; createdAt: number; updatedAt: number };

const MAX_CHARS = 500;

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T | null; error?: string }> {
  try {
    const res = await fetch(url, { cache: "no-store", ...init, headers: init?.body ? { "Content-Type": "application/json" } : undefined });
    const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    return { ok: res.ok, data, error: res.ok ? undefined : data?.error ?? "Something went wrong. Please try again." };
  } catch {
    return { ok: false, data: null, error: "Could not reach the service. Please try again." };
  }
}

/** Facts Lirava keeps across chats. Add, edit, delete, forget all, or switch memory off. */
export default function MemorySettings() {
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([api<{ memories: Memory[] }>("/api/memories"), api<{ preferences: Record<string, unknown> }>("/api/preferences")]).then(([list, prefs]) => {
      if (!active) return;
      if (list.ok && list.data) setMemories(list.data.memories);
      else {
        setMemories([]);
        setError(list.error ?? "");
      }
      if (prefs.ok && prefs.data) setEnabled(prefs.data.preferences.memoryEnabled !== false);
    });
    return () => {
      active = false;
    };
  }, []);

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    const res = await api("/api/preferences/memoryEnabled", { method: "PUT", body: JSON.stringify({ value: next }) });
    if (!res.ok) {
      setEnabled(!next);
      setError(res.error ?? "");
    }
  };

  const add = async () => {
    const content = draft.trim();
    if (!content) return;
    setError("");
    const res = await api<{ memory: Memory }>("/api/memories", { method: "POST", body: JSON.stringify({ content }) });
    if (res.ok && res.data) {
      setMemories((m) => [res.data!.memory, ...(m ?? [])]);
      setDraft("");
    } else setError(res.error ?? "");
  };

  const saveEdit = async (id: string) => {
    const content = editText.trim();
    if (!content) return;
    setError("");
    const res = await api<{ memory: Memory }>(`/api/memories/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify({ content }) });
    if (res.ok && res.data) {
      setMemories((m) => (m ?? []).map((x) => (x.id === id ? res.data!.memory : x)));
      setEditingId(null);
    } else setError(res.error ?? "");
  };

  const remove = async (id: string) => {
    setError("");
    const res = await api(`/api/memories/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) setMemories((m) => (m ?? []).filter((x) => x.id !== id));
    else setError(res.error ?? "");
  };

  const clearAll = async () => {
    setError("");
    const res = await api("/api/memories", { method: "DELETE" });
    setConfirmClear(false);
    if (res.ok) setMemories([]);
    else setError(res.error ?? "");
  };

  return (
    <div className="space-y-3">
      <div className="surface flex items-center gap-3 p-4">
        <Brain className="size-4 shrink-0 text-foreground/50" strokeWidth={1.5} aria-hidden />
        <span id="memory-switch-label" className="flex-1 text-body-sm">
          {enabled ? "Memory is on. Lirava uses these notes in every chat." : "Memory is off. Your notes are kept but not used."}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby="memory-switch-label"
          onClick={() => void toggle()}
          className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${enabled ? "bg-brand" : "bg-highlight"}`}
        >
          <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-4" : ""}`} />
        </button>
      </div>

      <form
        className="surface flex items-start gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <label htmlFor="new-memory" className="sr-only">
          Something for Lirava to remember
        </label>
        <textarea
          id="new-memory"
          rows={2}
          maxLength={MAX_CHARS}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void add();
            }
          }}
          placeholder="For example: I mostly appear before the Karnataka High Court"
          className="min-h-[44px] flex-1 resize-none rounded-lg border border-border bg-card px-3 py-2 text-[13.5px] outline-none placeholder:text-foreground/35 focus:border-brand/60"
        />
        <button type="submit" disabled={!draft.trim()} className="btn-primary h-9 px-3 text-[13px] disabled:opacity-40">
          Remember
        </button>
      </form>

      {error && (
        <p role="alert" className="text-[12.5px] text-destructive">
          {error}
        </p>
      )}

      {memories === null ? (
        <p className="text-body-sm text-foreground/45">Loading…</p>
      ) : memories.length === 0 ? (
        <p className="text-body-sm text-foreground/55">Nothing remembered yet. Anything you add here is kept privately for your account and can be removed at any time.</p>
      ) : (
        <>
          <ul className="surface divide-y divide-border">
            {memories.map((m) => (
              <li key={m.id} className="flex items-start gap-2 p-3">
                {editingId === m.id ? (
                  <>
                    <textarea
                      autoFocus
                      rows={2}
                      maxLength={MAX_CHARS}
                      value={editText}
                      aria-label="Edit memory"
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditingId(null);
                        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          void saveEdit(m.id);
                        }
                      }}
                      className="min-h-[44px] flex-1 resize-none rounded-lg border border-border bg-card px-3 py-2 text-[13.5px] outline-none focus:border-brand/60"
                    />
                    <button type="button" onClick={() => void saveEdit(m.id)} aria-label="Save" className="btn-quiet size-8 p-0">
                      <Check className="size-4" strokeWidth={1.75} />
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} aria-label="Cancel" className="btn-quiet size-8 p-0">
                      <X className="size-4" strokeWidth={1.75} />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="min-w-0 flex-1 py-1 text-[13.5px] break-words">{m.content}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(m.id);
                        setEditText(m.content);
                      }}
                      aria-label={`Edit: ${m.content}`}
                      className="btn-quiet size-8 p-0"
                    >
                      <Pencil className="size-3.5" strokeWidth={1.75} />
                    </button>
                    <button type="button" onClick={() => void remove(m.id)} aria-label={`Delete: ${m.content}`} className="btn-quiet size-8 p-0">
                      <Trash2 className="size-3.5" strokeWidth={1.75} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-end gap-2">
            {confirmClear ? (
              <>
                <span className="text-[12.5px] text-destructive">Forget all {memories.length} notes?</span>
                <button type="button" onClick={() => void clearAll()} className="btn-quiet h-8 px-3 text-[13px] text-destructive">
                  Forget all
                </button>
                <button type="button" onClick={() => setConfirmClear(false)} className="btn-quiet h-8 px-3 text-[13px]">
                  Cancel
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmClear(true)} className="btn-quiet h-8 px-3 text-[13px] text-foreground/60">
                Forget everything
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
