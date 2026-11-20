"use client";

import { useState, type ReactNode } from "react";
import { resetStore } from "@/lib/store";

export function LogoutButton({
  className,
  icon,
  label,
  menuItem = false,
}: {
  className?: string;
  icon?: ReactNode;
  /** Marks the button as an item of a role="menu" popup, so keyboard and screen-reader menu navigation includes it. */
  menuItem?: boolean;
  /** Text shown beside the icon. Without it, an icon alone is shown (as in compact icon buttons). */
  label?: string;
}) {
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Cookie cleanup is best-effort; still navigate to the login page.
    } finally {
      // Wipe cached vakils/chats/configs first, then hard-navigate: the next
      // account must never see the previous user's data.
      resetStore();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload required; router.push can keep stale caches
      window.location.assign("/login");
    }
  }

  return (
    <button
      type="button"
      role={menuItem ? "menuitem" : undefined}
      onClick={onClick}
      disabled={pending}
      className={className ?? "btn-quiet"}
      title="Log out"
      aria-label="Log out"
    >
      {label ? (
        <>
          {icon}
          <span className="truncate">{pending ? "Signing out…" : label}</span>
        </>
      ) : (
        (icon ?? (pending ? "Logging out..." : "Log out"))
      )}
    </button>
  );
}
