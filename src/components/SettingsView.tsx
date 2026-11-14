"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell, Plug } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { PageHeader, Section } from "./SettingsKit";

type Account = { name: string; email: string; role: string };

const noop = () => () => {};
const notificationPermission = () => ("Notification" in window ? Notification.permission : "unsupported");

export default function SettingsView() {
  const permission = useSyncExternalStore(noop, notificationPermission, () => "default");
  const [, force] = useState(0);
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { user?: Account } | null) => {
        if (active && j?.user) setAccount(j.user);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="rails mx-auto min-h-full max-w-[1080px] px-4 pb-16 sm:px-8">
        <PageHeader eyebrow="Settings" title="Settings" description="Your account, notifications and connected apps." />

        <Section eyebrow="Account" title="Your account" description="The account you are signed in with.">
          <div className="surface flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium">{account?.name ?? "…"}</p>
              <p className="truncate text-body-sm text-foreground/55">{account?.email ?? ""}</p>
            </div>
            {account?.role === "admin" && <span className="rounded-full bg-highlight px-2.5 py-1 text-[11px]">Administrator</span>}
            <LogoutButton />
          </div>
        </Section>

        <Section eyebrow="Apps" title="Connectors" description="Connect email, calendars and document storage privately to your account.">
          <Link href="/settings/connectors" className="surface flex items-center gap-3 p-4 transition-colors hover:border-brand/40">
            <Plug className="size-4 text-foreground/50" strokeWidth={1.5} />
            <span className="flex-1 text-body-sm">Manage connected apps</span>
          </Link>
        </Section>

        <Section eyebrow="Notifications" title="Desktop notifications" description="Get notified when a response finishes while you are in another tab.">
          <div className="surface flex items-center gap-3 p-4">
            <Bell className="size-4 text-foreground/50" strokeWidth={1.5} />
            <span className="flex-1 text-body-sm">
              {permission === "granted"
                ? "Notifications are on."
                : permission === "denied"
                  ? "Notifications are blocked in your browser settings for this site."
                  : permission === "unsupported"
                    ? "This browser doesn't support notifications."
                    : "Notifications are off."}
            </span>
            {permission === "default" && (
              <button className="btn-primary h-8 px-3 text-[13px]" onClick={() => Notification.requestPermission().then(() => force((n) => n + 1))}>
                Turn on
              </button>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}
