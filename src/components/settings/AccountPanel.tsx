"use client";

import { useEffect, useState } from "react";
import { KeyRound, LogOut } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Section } from "@/components/SettingsKit";
import { kbRequest } from "@/lib/knowledge-api";

type Account = { name: string; email: string; role: string };

const inputClass = "mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-[13.5px] text-foreground outline-none focus:border-brand/60";

/** Name, password and sign-out. The email address is shown but cannot be changed here. */
export default function AccountPanel() {
  const [account, setAccount] = useState<Account | null>(null);
  const [name, setName] = useState("");
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void kbRequest<{ user: Account }>("/api/auth/me").then((res) => {
      if (!active || !res.ok) return;
      setAccount(res.data.user);
      setName(res.data.user.name);
    });
    return () => {
      active = false;
    };
  }, []);

  const saveName = async () => {
    if (busy || !name.trim()) return;
    setBusy(true);
    setNameMsg(null);
    const res = await kbRequest<{ user: Account }>("/api/auth/profile", { method: "PATCH", body: { name } });
    setBusy(false);
    if (res.ok) {
      setAccount(res.data.user);
      setName(res.data.user.name);
      setNameMsg({ ok: true, text: "Name updated." });
    } else setNameMsg({ ok: false, text: res.error });
  };

  const savePassword = async () => {
    if (busy) return;
    setPwMsg(null);
    if (next !== confirm) return setPwMsg({ ok: false, text: "The new password and its confirmation do not match." });
    setBusy(true);
    const res = await kbRequest<{ otherSessionsEnded: number }>("/api/auth/password", { method: "POST", body: { currentPassword: current, newPassword: next } });
    setBusy(false);
    if (!res.ok) return setPwMsg({ ok: false, text: res.error });
    setCurrent("");
    setNext("");
    setConfirm("");
    const others = res.data.otherSessionsEnded;
    setPwMsg({ ok: true, text: others > 0 ? `Password changed. ${others} other ${others === 1 ? "device was" : "devices were"} signed out.` : "Password changed." });
  };

  return (
    <>
      <Section eyebrow="Profile" title="Your details" description="The name shown in the sidebar. Your email address is how you sign in and cannot be changed here.">
        <form
          className="surface grid gap-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void saveName();
          }}
        >
          <label className="block text-[12px] text-foreground/60">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={inputClass} />
          </label>
          <div className="text-[12px] text-foreground/60">
            Email
            <p className="mt-1 flex h-9 items-center gap-2 text-[13.5px] text-foreground">
              <span className="truncate">{account?.email ?? "…"}</span>
              {account?.role === "admin" && <span className="rounded-full bg-highlight px-2 py-0.5 text-[11px]">Administrator</span>}
            </p>
          </div>
          <div className="flex items-center justify-end gap-3">
            {nameMsg && (
              <p role={nameMsg.ok ? "status" : "alert"} className={`mr-auto text-[12.5px] ${nameMsg.ok ? "text-success" : "text-destructive"}`}>
                {nameMsg.text}
              </p>
            )}
            <button type="submit" disabled={busy || !name.trim() || name.trim() === account?.name} className="btn-primary h-9 px-3 text-[13px] disabled:opacity-40">
              Save name
            </button>
          </div>
        </form>
      </Section>

      <Section eyebrow="Security" title="Password" description="Changing it signs you out of every other device. You stay signed in here.">
        <form
          className="surface grid gap-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void savePassword();
          }}
        >
          <label className="block text-[12px] text-foreground/60">
            Current password
            <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} maxLength={128} className={inputClass} />
          </label>
          <label className="block text-[12px] text-foreground/60">
            New password
            <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} maxLength={128} className={inputClass} />
          </label>
          <label className="block text-[12px] text-foreground/60">
            Confirm new password
            <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} maxLength={128} className={inputClass} />
          </label>
          <p className="text-[12px] text-foreground/50">At least 8 characters, with a letter and a number.</p>
          <div className="flex items-center justify-end gap-3">
            {pwMsg && (
              <p role={pwMsg.ok ? "status" : "alert"} className={`mr-auto text-[12.5px] ${pwMsg.ok ? "text-success" : "text-destructive"}`}>
                {pwMsg.text}
              </p>
            )}
            <button type="submit" disabled={busy || !current || !next || !confirm} className="btn-primary flex h-9 items-center gap-1.5 px-3 text-[13px] disabled:opacity-40">
              <KeyRound className="size-4" strokeWidth={1.75} />
              Change password
            </button>
          </div>
        </form>
      </Section>

      <Section eyebrow="Session" title="Sign out" description="Ends your session on this device.">
        <div className="surface flex items-center gap-3 p-4">
          <LogOut className="size-4 shrink-0 text-foreground/50" strokeWidth={1.5} aria-hidden />
          <span className="flex-1 text-body-sm">Signed in as {account?.email ?? "…"}</span>
          <LogoutButton />
        </div>
      </Section>
    </>
  );
}
