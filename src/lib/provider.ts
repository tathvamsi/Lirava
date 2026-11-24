"use client";

import { useSyncExternalStore } from "react";

/** Which AI model the user picked for their chats: "custom" (Lirava's own), "nvidia" or "sarvam". Kept in this browser only. */
const KEY = "lirava.provider";
const listeners = new Set<() => void>();
// Used when storage is blocked, so the choice still holds until the page is closed.
let memory: string | undefined;

function read(): string | undefined {
  try {
    return window.localStorage.getItem(KEY) || memory;
  } catch {
    return memory; // storage can be blocked (private windows)
  }
}

/** The choice at the moment of sending; undefined means "use the server's default". */
export function getSelectedProvider(): string | undefined {
  return typeof window === "undefined" ? undefined : read();
}

export function setSelectedProvider(id: string | undefined) {
  memory = id;
  try {
    if (id) window.localStorage.setItem(KEY, id);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* not saved for later visits */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  window.addEventListener("storage", l);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", l);
  };
};

/** The chosen model, kept in step across the page (and across tabs). */
export function useSelectedProvider(): string | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}

export interface ProviderOption {
  id: string;
  label: string;
  model: string;
  available: boolean;
  hosted: boolean;
  vision: boolean;
  note: string;
  isDefault: boolean;
}
