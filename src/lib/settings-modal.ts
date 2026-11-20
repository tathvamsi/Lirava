"use client";

import { useSyncExternalStore } from "react";

/** Which settings tab the dialog is showing, or null while it is closed. Held in memory only. */
let current: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Opens the settings dialog on a tab (or moves it to that tab if it is already open). */
export function openSettings(tab = "general") {
  if (current === tab) return;
  current = tab;
  emit();
}

export function closeSettings() {
  if (current === null) return;
  current = null;
  emit();
}

/** How the last app-connection attempt ended, kept just long enough for the Connections tab to show it. */
let connectorResult: "connected" | "failed" | null = null;

export function setConnectorResult(result: "connected" | "failed") {
  connectorResult = result;
}

/** Returns the pending connection result once, then forgets it. */
export function takeConnectorResult(): "connected" | "failed" | null {
  const result = connectorResult;
  connectorResult = null;
  return result;
}

/** The open tab id, or null when the dialog is closed. */
export function useSettingsTab(): string | null {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => current,
    () => null,
  );
}
