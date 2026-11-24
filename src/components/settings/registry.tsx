"use client";

import { useState, useSyncExternalStore, type ComponentType } from "react";
import { Archive, Bell, Blocks, BookOpen, CalendarClock, Database, Info, Keyboard, Languages, NotebookPen, Plug, ShieldCheck, SlidersHorizontal, Sparkles, UserRound } from "lucide-react";
import { DOCUMENT_LANGUAGES } from "@/lib/citationCheck";
import { openSettings } from "@/lib/settings-modal";
import { setDocumentLanguage, useStore } from "@/lib/store";
import type { DocumentLanguage } from "@/lib/types";
import { PrivacyContent } from "@/components/marketing/PrivacyContent";
import KnowledgeDetail from "@/components/knowledge/KnowledgeDetail";
import KnowledgeLibrary from "@/components/knowledge/KnowledgeLibrary";
import MemorySettings from "@/components/MemorySettings";
import NoteEditor from "@/components/notes/NoteEditor";
import NotesLibrary from "@/components/notes/NotesLibrary";
import { Section } from "@/components/SettingsKit";
import AboutPanel from "./AboutPanel";
import AccountPanel from "./AccountPanel";
import ArchivedChatsPanel from "./ArchivedChatsPanel";
import AutomationsPanel from "./AutomationsPanel";
import ConnectionsPanel from "./ConnectionsPanel";
import DataControlsPanel from "./DataControlsPanel";
import ShortcutsPanel from "./ShortcutsPanel";

const noop = () => () => {};
const notificationPermission = () => ("Notification" in window ? Notification.permission : "unsupported");

function GeneralPanel() {
  const documentLanguage = useStore((s) => s.documentLanguage);
  return (
    <Section eyebrow="Documents" title="Language for documents" description="The language petitions, notices, replies and other documents are written in. Leave it on “Ask me each time” and the assistant asks before it starts writing.">
      <div className="surface flex flex-wrap items-center gap-3 p-4">
        <Languages className="size-4 shrink-0 text-foreground/50" strokeWidth={1.5} aria-hidden />
        <label htmlFor="document-language" className="flex-1 text-body-sm">
          Write documents in
        </label>
        <select
          id="document-language"
          value={documentLanguage ?? ""}
          onChange={(e) => setDocumentLanguage(e.target.value ? (e.target.value as DocumentLanguage) : null)}
          className="h-9 min-w-[10rem] rounded-lg border border-border bg-card px-3 text-[13px]"
        >
          <option value="">Ask me each time</option>
          {DOCUMENT_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.native === l.name ? l.name : `${l.name} (${l.native})`}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-2 text-[12px] text-muted">Case citations and section numbers stay in their checkable form (for example “2023 INSC 1043” or “Section 103 BNS”), whatever the language.</p>
    </Section>
  );
}

function NotificationsPanel() {
  const permission = useSyncExternalStore(noop, notificationPermission, () => "default");
  const [, force] = useState(0);
  return (
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
  );
}

function PersonalizationPanel() {
  return (
    <Section eyebrow="Personalisation" title="Memory" description="Things you want Lirava to remember across chats, such as your usual court or how you like documents formatted. Kept privately for your account.">
      <MemorySettings />
    </Section>
  );
}

/** Knowledge inside the dialog: the list, and one collection at a time, without leaving the dialog. */
function KnowledgeTab() {
  const [openId, setOpenId] = useState<string | null>(null);
  return openId ? <KnowledgeDetail id={openId} onBack={() => setOpenId(null)} /> : <KnowledgeLibrary embedded onOpen={setOpenId} />;
}

/** Notes inside the dialog: the list, and one note at a time, without leaving the dialog. */
function NotesTab() {
  const [openId, setOpenId] = useState<string | null>(null);
  return openId ? <NoteEditor id={openId} onBack={() => setOpenId(null)} /> : <NotesLibrary embedded onOpen={setOpenId} />;
}

function PrivacyPanel() {
  return (
    <div className="prose prose-invert max-w-none prose-headings:font-serif prose-headings:tracking-tight prose-p:text-foreground/70">
      <PrivacyContent />
    </div>
  );
}

/** The Customization page: a front door to the things that tailor Lirava to how a person works. */
const CUSTOMIZE_CARDS = [
  { id: "automations", icon: CalendarClock, title: "Automations", text: "Prompts that run by themselves on a schedule, such as a morning hearing brief." },
  { id: "connections", icon: Plug, title: "Integrations", text: "Connect your apps and install plugins." },
  { id: "personalization", icon: Sparkles, title: "Memory", text: "What Lirava remembers about you across chats." },
  { id: "knowledge", icon: BookOpen, title: "Knowledge", text: "Collections of your own documents to answer from." },
  { id: "notes", icon: NotebookPen, title: "Notes", text: "Your private working notes." },
] as const;

function CustomizationPanel() {
  return (
    <Section title="Make Lirava yours" description="Set up the things that tailor Lirava to how you work.">
      <ul className="grid gap-3 sm:grid-cols-2">
        {CUSTOMIZE_CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <li key={c.id}>
              <button type="button" onClick={() => openSettings(c.id)} className="surface flex h-full w-full items-start gap-3 p-4 text-left transition-colors hover:border-brand/40">
                <Icon className="mt-0.5 size-4 shrink-0 text-foreground/50" strokeWidth={1.5} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium">{c.title}</span>
                  <span className="mt-0.5 block text-[12.5px] text-foreground/60">{c.text}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

export type TabGroup = "settings" | "customize" | "library" | "legal";
export type TabDef = { id: string; label: string; icon: ComponentType<{ className?: string; strokeWidth?: number }>; group: TabGroup; panel: ComponentType };

export const TABS: TabDef[] = [
  { id: "general", label: "General", icon: SlidersHorizontal, group: "settings", panel: GeneralPanel },
  { id: "notifications", label: "Notifications", icon: Bell, group: "settings", panel: NotificationsPanel },
  { id: "personalization", label: "Personalization", icon: Sparkles, group: "settings", panel: PersonalizationPanel },
  { id: "customization", label: "Customization", icon: Blocks, group: "customize", panel: CustomizationPanel },
  { id: "connections", label: "Integrations", icon: Plug, group: "customize", panel: ConnectionsPanel },
  { id: "data", label: "Data controls", icon: Database, group: "settings", panel: DataControlsPanel },
  { id: "archived", label: "Archived chats", icon: Archive, group: "settings", panel: ArchivedChatsPanel },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard, group: "settings", panel: ShortcutsPanel },
  { id: "account", label: "Account", icon: UserRound, group: "settings", panel: AccountPanel },
  { id: "about", label: "About", icon: Info, group: "settings", panel: AboutPanel },
  { id: "knowledge", label: "Knowledge", icon: BookOpen, group: "library", panel: KnowledgeTab },
  { id: "notes", label: "Notes", icon: NotebookPen, group: "library", panel: NotesTab },
  { id: "automations", label: "Automations", icon: CalendarClock, group: "customize", panel: AutomationsPanel },
  { id: "privacy", label: "Privacy", icon: ShieldCheck, group: "legal", panel: PrivacyPanel },
];
