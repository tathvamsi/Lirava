"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ExternalLink, KeyRound, Plug, Puzzle } from "lucide-react";
import { Section } from "@/components/SettingsKit";
import { kbRequest } from "@/lib/knowledge-api";
import { takeConnectorResult } from "@/lib/settings-modal";

type Connector = { slug: string; name: string; description: string; category: string; connected: boolean; status: string };
type CatalogPlugin = { id: string; name: string; version: string; category: string; description: string; commands: string[] };
type Installed = { id: string; pluginId: string; enabled: number };

type Loaded = {
  configured: boolean;
  connectors: Connector[];
  connectorError: string;
  ownKey: boolean;
  catalog: CatalogPlugin[];
  installed: Installed[];
};

const BASE = "/api/integrations";

async function loadAll(): Promise<Loaded> {
  const [list, key, catalog, installed] = await Promise.all([
    kbRequest<{ configured: boolean; connectors: Connector[] }>(`${BASE}/connectors`),
    kbRequest<{ configured: boolean }>(`${BASE}/connectors/key`),
    kbRequest<{ plugins: CatalogPlugin[] }>(`${BASE}/plugins/catalog`),
    kbRequest<{ installed: Installed[] }>(`${BASE}/plugins`),
  ]);
  return {
    configured: list.ok ? list.data.configured : false,
    connectors: list.ok ? list.data.connectors : [],
    connectorError: list.ok ? "" : list.error,
    ownKey: key.ok ? key.data.configured : false,
    catalog: catalog.ok ? catalog.data.plugins : [],
    installed: installed.ok ? installed.data.installed : [],
  };
}

const STATUS_TEXT: Record<string, string> = { active: "Connected", expired: "Expired", initiated: "Not connected" };

/** Composio's dashboard, where a person signs in and copies their project API key. */
const COMPOSIO_URL = "https://platform.composio.dev";

function ComposioLink({ children }: { children: ReactNode }) {
  return (
    <a href={COMPOSIO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-readable hover:underline">
      {children}
      <ExternalLink className="size-3" strokeWidth={1.75} aria-hidden />
    </a>
  );
}

/** Connect outside apps and install plugins. Uses the integrations the backend already provides. */
export default function ConnectionsPanel() {
  const [data, setData] = useState<Loaded | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(() => {
    const result = takeConnectorResult();
    return result ? { ok: result === "connected", text: result === "connected" ? "App connected." : "The app could not be connected. Please try again." } : null;
  });

  useEffect(() => {
    let active = true;
    void loadAll().then((d) => active && setData(d));
    return () => {
      active = false;
    };
  }, []);

  /** Runs an action, shows its error if it fails, and reloads everything. */
  const act = async (id: string, run: () => Promise<{ ok: boolean; error?: string }>, success?: string) => {
    setBusy(id);
    setMessage(null);
    const res = await run();
    if (!res.ok) setMessage({ ok: false, text: res.error ?? "Something went wrong. Please try again." });
    else if (success) setMessage({ ok: true, text: success });
    setData(await loadAll());
    setBusy("");
  };

  const saveKey = () =>
    act("key", async () => {
      const res = await kbRequest(`${BASE}/connectors/key`, { method: "PUT", body: { apiKey: apiKey.trim() } });
      if (res.ok) setApiKey("");
      return res;
    }, "Connector key saved.");

  const connect = async (slug: string) => {
    setBusy(slug);
    setMessage(null);
    const res = await kbRequest<{ url: string }>(`${BASE}/connectors/${encodeURIComponent(slug)}/connect`, { method: "POST" });
    if (res.ok && res.data.url) {
      // The provider's sign-in page; it sends the person back here when done.
      window.location.assign(res.data.url);
      return;
    }
    setBusy("");
    setMessage({ ok: false, text: res.ok ? "No sign-in address was returned." : res.error });
  };

  if (!data) return <p className="py-4 text-body-sm text-foreground/45">Loading…</p>;

  const installedByPlugin = new Map(data.installed.map((i) => [i.pluginId, i]));

  return (
    <>
      {message && (
        <p role={message.ok ? "status" : "alert"} className={`mt-2 text-[12.5px] ${message.ok ? "text-success" : "text-destructive"}`}>
          {message.text}
        </p>
      )}

      <Section title="Connect your apps" description={`Sign in to each app on its own page and approve access (OAuth). ${data.configured ? "You do not need a Composio account or any key. " : ""}You can disconnect at any time.`}>
        {!data.configured && (
          <p className="surface mb-3 p-4 text-body-sm text-foreground/70">App connections are not set up yet. Ask your administrator to turn them on, or add your own Composio key under Advanced below.</p>
        )}
        {data.connectorError && (
          <p role="alert" className="mb-3 text-[12.5px] text-destructive">
            {data.connectorError}
          </p>
        )}
        <ul className="surface divide-y divide-border">
          {data.connectors.map((c) => (
            <li key={c.slug} className="flex items-center gap-3 p-3">
              <Plug className="size-4 shrink-0 text-foreground/50" strokeWidth={1.5} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium">{c.name}</span>
                <span className="block truncate text-[12px] text-foreground/55">{c.description}</span>
              </span>
              <span className={`shrink-0 text-[12px] ${c.connected ? "text-success" : c.status === "expired" ? "text-warning" : "text-foreground/45"}`}>{STATUS_TEXT[c.status] ?? "Not connected"}</span>
              {c.connected ? (
                <button type="button" disabled={busy !== ""} onClick={() => void act(c.slug, () => kbRequest(`${BASE}/connectors/${encodeURIComponent(c.slug)}`, { method: "DELETE" }), `${c.name} disconnected.`)} className="btn-quiet h-8 shrink-0 px-2.5 text-[12.5px]">
                  Disconnect
                </button>
              ) : (
                <button type="button" disabled={busy !== "" || !data.configured} onClick={() => void connect(c.slug)} className="btn-primary h-8 shrink-0 px-2.5 text-[12.5px] disabled:opacity-40">
                  {c.status === "expired" ? "Reconnect" : "Connect"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="Advanced" title="Use your own Composio key" description="Most people do not need this: your administrator's key already lets you connect apps. Add your own only if you manage your own Composio project.">
        <details open={!data.configured} className="surface group">
          <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-body-sm select-none">
            <KeyRound className="size-4 shrink-0 text-foreground/50" strokeWidth={1.5} aria-hidden />
            <span className="flex-1">{data.ownKey ? "Using your own key" : data.configured ? "Using the workspace's key" : "No key yet"}</span>
            <span className="text-[12px] text-foreground/50 group-open:hidden">Show</span>
            <span className="hidden text-[12px] text-foreground/50 group-open:inline">Hide</span>
          </summary>
          <div className="grid gap-3 border-t border-border p-4">
            <p className="text-[12.5px] text-foreground/60">
              Need a key? <ComposioLink>Get your Composio API key</ComposioLink>. Sign in or create an account, open your project, and copy its API key (it starts with <span className="font-mono">ak_</span>), then paste it below.
            </p>
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void saveKey();
              }}
            >
              <label className="sr-only" htmlFor="connector-key">
                Composio project key
              </label>
              <input
                id="connector-key"
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="ak_…"
                className="h-9 min-w-[12rem] flex-1 rounded-lg border border-border bg-card px-3 font-mono text-[13px] outline-none placeholder:text-foreground/35 focus:border-brand/60"
              />
              <button type="submit" disabled={busy !== "" || !apiKey.trim().startsWith("ak_")} className="btn-primary h-9 px-3 text-[13px] disabled:opacity-40">
                Save key
              </button>
              {data.ownKey && (
                <button type="button" disabled={busy !== ""} onClick={() => void act("key", () => kbRequest(`${BASE}/connectors/key`, { method: "DELETE" }), "Key removed.")} className="btn-quiet h-9 px-3 text-[13px]">
                  Remove key
                </button>
              )}
            </form>
          </div>
        </details>
      </Section>

      <Section eyebrow="Extensions" title="Plugins" description="Add ready-made commands for common litigation work.">
        {data.catalog.length === 0 ? (
          <p className="text-body-sm text-foreground/55">No plugins are available.</p>
        ) : (
          <ul className="space-y-3">
            {data.catalog.map((p) => {
              const installed = installedByPlugin.get(p.id);
              return (
                <li key={p.id} className="surface flex items-start gap-3 p-4">
                  <Puzzle className="mt-0.5 size-4 shrink-0 text-foreground/50" strokeWidth={1.5} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="text-[14px] font-medium">{p.name}</span>
                      <span className="font-mono text-[11px] text-foreground/45">v{p.version}</span>
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-foreground/60">{p.description}</span>
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {p.commands.map((cmd) => (
                        <span key={cmd} className="rounded-md bg-highlight px-1.5 py-0.5 font-mono text-[11px] text-foreground/70">
                          {cmd}
                        </span>
                      ))}
                    </span>
                  </span>
                  {installed ? (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={installed.enabled === 1}
                      aria-label={`${p.name} enabled`}
                      disabled={busy !== ""}
                      onClick={() => void act(p.id, () => kbRequest(`${BASE}/plugins/${encodeURIComponent(installed.id)}`, { method: "PATCH", body: { enabled: installed.enabled !== 1 } }))}
                      className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors ${installed.enabled === 1 ? "bg-brand" : "bg-highlight"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform ${installed.enabled === 1 ? "translate-x-4" : ""}`} />
                    </button>
                  ) : (
                    <button type="button" disabled={busy !== ""} onClick={() => void act(p.id, () => kbRequest(`${BASE}/plugins`, { method: "POST", body: { pluginId: p.id } }), `${p.name} installed.`)} className="btn-primary h-8 shrink-0 px-2.5 text-[12.5px] disabled:opacity-40">
                      Install
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
