"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { updateArtifactLocally } from "@/lib/store";

export type SaveState = "saved" | "dirty" | "saving" | "failed";

/**
 * Saves the user's edits to a document or plan a moment after they stop typing, and once more when the panel
 * closes or another document opens, so nothing typed is lost. The status is shown beside the title.
 */
export function useArtifactSave(artifactId: string, delayMs = 1200) {
  const [state, setState] = useState<SaveState>("saved");
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const idRef = useRef(artifactId);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (pending.current === null || inFlight.current) return;
    const content = pending.current;
    pending.current = null;
    inFlight.current = true;
    setState("saving");
    try {
      const res = await fetch(`/api/artifacts/${encodeURIComponent(idRef.current)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { artifact?: Parameters<typeof updateArtifactLocally>[0] };
      if (data.artifact) updateArtifactLocally(data.artifact);
      // More typing may have arrived while this save was running.
      setState(pending.current === null ? "saved" : "dirty");
    } catch {
      // Keep the text so Retry can send it again, unless newer text has already replaced it.
      pending.current ??= content;
      setState("failed");
    } finally {
      inFlight.current = false;
      if (pending.current !== null && timer.current === null) timer.current = setTimeout(() => void flush(), delayMs);
    }
  }, [delayMs]);

  const change = useCallback(
    (content: string) => {
      pending.current = content;
      setState("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delayMs);
    },
    [delayMs, flush],
  );

  // Whatever is still waiting is sent when this view goes away.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current !== null && !inFlight.current) {
        void fetch(`/api/artifacts/${encodeURIComponent(idRef.current)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: pending.current }),
          keepalive: true,
        }).catch(() => undefined);
      }
    },
    [],
  );

  return { state, change, retry: flush };
}
