"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, PlugZap } from "lucide-react";

type Plugin = {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
  commands: string[];
  optionalConnectors: string[];
};
type Installed = { id: string; pluginId: string; enabled: number };

export default function PluginsSettings() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [installed, setInstalled] = useState<Installed[]>([]);
  const [tab, setTab] = useState<"installed" | "browse">("browse");
  const [error, setError] = useState<string | null>(null);
  const load = () =>
    Promise.all([
      fetch("/api/backend/plugins/catalog").then((r) => r.json()),
      fetch("/api/backend/plugins").then((r) => r.json()),
    ])
      .then(([catalog, state]) => {
        setPlugins(catalog.plugins || []);
        setInstalled(state.installed || []);
      })
      .catch(() => setError("Could not load plugins."));
  useEffect(() => {
    load();
  }, []);
  const visible = useMemo(
    () =>
      plugins.filter(
        (plugin) =>
          tab === "browse" ||
          installed.some((item) => item.pluginId === plugin.id),
      ),
    [plugins, installed, tab],
  );
  const install = async (pluginId: string) => {
    const response = await fetch("/api/backend/plugins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pluginId }),
    });
    if (!response.ok) setError("Could not install plugin.");
    else load();
  };
  const toggle = async (item: Installed) => {
    await fetch(`/api/backend/plugins/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !item.enabled }),
    });
    load();
  };
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-10">
      <p className="text-sm text-brand">Settings</p>
      <h1 className="mt-3 font-serif text-4xl tracking-[-0.04em]">Plugins</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-foreground/60">
        Add focused legal workflows. Outputs remain drafts for lawyer review.
      </p>
      {error && (
        <p role="alert" className="mt-6 text-sm text-red-200">
          {error}
        </p>
      )}
      <div className="mt-8 flex border-b border-border pb-4">
        <div className="rounded-lg bg-card p-1">
          <button
            onClick={() => setTab("installed")}
            className={`rounded-md px-3 py-1.5 text-[13px] ${tab === "installed" ? "bg-highlight" : "text-foreground/55"}`}
          >
            Installed
          </button>
          <button
            onClick={() => setTab("browse")}
            className={`rounded-md px-3 py-1.5 text-[13px] ${tab === "browse" ? "bg-highlight" : "text-foreground/55"}`}
          >
            Browse
          </button>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((plugin) => {
          const item = installed.find((entry) => entry.pluginId === plugin.id);
          return (
            <article
              key={plugin.id}
              className="rounded-xl border border-border bg-card p-5"
            >
              <PlugZap className="size-5 text-brand" />
              <p className="mt-4 text-[15px] font-medium">{plugin.name}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-foreground/55">
                {plugin.description}
              </p>
              <p className="mt-3 text-[11px] text-foreground/45">
                {plugin.commands.join(" · ")}
              </p>
              {item ? (
                <button
                  onClick={() => void toggle(item)}
                  className="mt-5 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border text-[13px]"
                >
                  <Check className="size-4 text-emerald-400" />
                  {item.enabled ? "Enabled" : "Enable"}
                </button>
              ) : (
                <button
                  onClick={() => void install(plugin.id)}
                  className="mt-5 h-9 w-full rounded-lg border border-border text-[13px] hover:border-brand"
                >
                  Install
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
