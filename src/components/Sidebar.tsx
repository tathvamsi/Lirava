"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive, ArchiveRestore, Boxes, ChevronRight, Folder,ChevronsUpDown, Ellipsis, FolderKanban, Globe, Keyboard, LayoutGrid, LogOut, Palette, PanelLeftClose, Pencil, Pin, PinOff, Scale, Search, Settings, ShieldCheck, SquarePen, Trash2, Upload, X } from "lucide-react";
import { backfillConversationTitles, setConversationFlags, deleteConversation, listMatters, moveConversationToMatter, renameConversation } from "@/app/actions";
import { LogoutButton } from "@/components/auth/logout-button";
import { deleteConversationLocally, getState, markRead, renameConversationLocally, updateConversationFlagsLocally, updateConversationMatterLocally, useStore } from "@/lib/store";
import { setSidebarCollapsed, setSidebarOpen, toggleSidebar, useSidebarCollapsed, useSidebarOpen } from "@/lib/ui";
import { timeAgo } from "@/lib/status";
import { stripThinkingBlocks } from "@/lib/strip-thinking";
import { parseClarify } from "@/lib/clarify";
import type { Conversation, Matter, Message } from "@/lib/types";
import { LiravaLogo } from "@/components/brand/LiravaLogo";

export function Wordmark({ className = "" }: { className?: string }) {
  return <LiravaLogo className={className} />;
}

/** Last readable line of a conversation, for the preview under its title. */
function preview(messages: Message[], convId: string): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.conversationId !== convId) continue;
    if (m.role === "card" && m.card?.status === "pending") return `Needs you: ${m.card.title}`;
    if (m.role === "vakil") {
      const card = parseClarify(stripThinkingBlocks(m.text));
      const text = card.prose.trim();
      if (card.questions || card.pending) return "Needs your answer";
      if (text) return text.replace(/[#*_`>|[\]]/g, "").replace(/\s+/g, " ");
      continue;
    }
    if (m.role === "user" && m.text) return `You: ${m.text.replace(/[#*_`>|[\]]/g, "").replace(/\s+/g, " ")}`;
  }
  return "";
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const activeConv = useSearchParams().get("c");
  const vakils = useStore((s) => s.vakils);
  const messages = useStore((s) => s.messages);
  const lastRead = useStore((s) => s.lastRead);
  const conversations = useStore((s) => s.conversations);
  const loaded = useStore((s) => s.loaded);
  const connected = useStore((s) => s.connected);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [, start] = useTransition();

  // ── Conversation options menu (Rename / Pin / Share / Archive / Delete) ──
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [expandedMatterIds, setExpandedMatterIds] = useState<string[]>([]);
  const [movingId, setMovingId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  // Pinned and archived are properties of the chat itself, stored in PostgreSQL.
  const pinnedIds = useMemo(() => conversations.filter((c) => c.pinned).map((c) => c.id), [conversations]);
  const archivedIds = useMemo(() => conversations.filter((c) => c.archived).map((c) => c.id), [conversations]);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { user?: { id?: string; name: string; email: string; role: string } } | null) => {
        if (!active || !data?.user) return;
        setUser(data.user);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  // Once the workspace has loaded: move pins/archives this browser kept in the past onto the chats themselves
  // (only chats that belong to the signed-in person can match), and give chats that still carry a placeholder
  // title a name taken from their first question.
  const housekeeping = useRef(false);
  useEffect(() => {
    if (!loaded || housekeeping.current) return;
    housekeeping.current = true;
    const mine = getState().conversations;
    try {
      for (const [key, flag] of [["soli:pinned", "pinned"], ["soli:archived", "archived"]] as const) {
        const raw = localStorage.getItem(key);
        if (raw === null) continue;
        const ids: unknown = JSON.parse(raw);
        for (const id of Array.isArray(ids) ? ids : []) {
          if (typeof id === "string" && mine.some((c) => c.id === id && !c[flag])) {
            updateConversationFlagsLocally(id, { [flag]: true });
            void setConversationFlags(id, { [flag]: true }).catch(() => undefined);
          }
        }
        localStorage.removeItem(key);
      }
      localStorage.removeItem("soli:conversation-title-backfill-v1");
      localStorage.removeItem("soli:owner");
      localStorage.removeItem("vakils.lastRead");
      localStorage.removeItem("dots.lastRead");
      localStorage.removeItem("soli_artifact_board_width");
    } catch {
      /* storage unavailable: nothing to move */
    }
    const placeholder = new Set(["", "New matter chat", "New consultation", "New Legal Consultation", "Untitled Conversation"]);
    if (mine.some((c) => placeholder.has(c.title))) {
      void backfillConversationTitles()
        .then((renamed) => renamed.forEach(({ id, title }) => renameConversationLocally(id, title)))
        .catch(() => undefined);
    }
  }, [loaded]);

  useEffect(() => {
    let active = true;
    void listMatters().then((items) => {
      if (!active) return;
      setMatters(items);
      setExpandedMatterIds((current) => Array.from(new Set([...current, ...items.map((item) => item.id)])));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const toggleFlag = (id: string, flag: "pinned" | "archived", on: boolean) => {
    updateConversationFlagsLocally(id, { [flag]: on });
    void setConversationFlags(id, { [flag]: on }).catch(() => updateConversationFlagsLocally(id, { [flag]: !on }));
  };

  // Close the menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpenId) return;
    const onDown = (e: PointerEvent) => {
      // If clicking a kebab trigger button, allow its own onClick to toggle
      if ((e.target as HTMLElement)?.closest?.("[data-conv-trigger]")) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpenId(null);
        setRenamingId(null);
      }
    };
    const onScroll = () => setMenuOpenId(null);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [menuOpenId]);

  useEffect(() => {
    if (!profileOpen) return;
    const onDown = (e: PointerEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setProfileOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);


  const vakilHref = (vakilId: string, convId?: string): string => {
    const canonicalId = vakilId;
    return convId ? `/vakil/${canonicalId}?c=${convId}` : `/vakil/${canonicalId}`;
  };
  const newChatHref = vakils[0] ? vakilHref(vakils[0].id, "new") : "/";
  const drawerOpen = useSidebarOpen();
  const collapsed = useSidebarCollapsed();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === "b" || e.key === "B" || e.key === "[" || e.key === "\\")) {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA") && e.key !== "b" && e.key !== "B") {
          return;
        }
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const dotById = useMemo(() => new Map(vakils.map((d) => [d.id, d])), [vakils]);

  // General chat history only: matter chats live exclusively under their matter.
  // Archived chats are hidden unless "Archived" is expanded.
  const recent = useMemo(() => {
    const query = q.trim().toLowerCase();
    const generalChats = conversations.filter((c) => !c.matterId);
    const visible = showArchived ? generalChats : generalChats.filter((c) => !archivedIds.includes(c.id));
    const sorted = [...visible].sort((a, b) => {
      const ap = pinnedIds.includes(a.id) ? 0 : 1;
      const bp = pinnedIds.includes(b.id) ? 0 : 1;
      return ap - bp || b.updatedAt - a.updatedAt;
    });
    if (!query) return sorted;
    const hits = new Set(
      messages
        .filter((m) => {
          const text = m.role === "vakil" ? stripThinkingBlocks(m.text) : m.text;
          return m.conversationId && text.toLowerCase().includes(query);
        })
        .map((m) => m.conversationId),
    );
    return sorted.filter((c) => c.title.toLowerCase().includes(query) || hits.has(c.id));
  }, [conversations, messages, q, pinnedIds, archivedIds, showArchived]);
  const archivedCount = useMemo(() => conversations.filter((c) => !c.matterId && archivedIds.includes(c.id)).length, [conversations, archivedIds]);

  const unread = (c: Conversation) => {
    const since = lastRead[c.vakilId];
    return since !== undefined && c.updatedAt > since && messages.some((m) => m.conversationId === c.id && m.role === "vakil" && m.createdAt > since);
  };

  const remove = (c: Conversation) =>
    start(async () => {
      // Optimistically remove from local store so UI updates immediately without refreshing:
      deleteConversationLocally(c.id);
      setConfirming(null);
      setMenuOpenId(null);
      if (c.id === activeConv) router.push(vakilHref(c.vakilId));
      try {
        await deleteConversation(c.id);
      } catch {
        /* already deleted elsewhere — just clear the confirm row */
      }
    });

  const saveRename = (c: Conversation) =>
    start(async () => {
      const title = draft.trim().slice(0, 80);
      setRenamingId(null);
      if (title && title !== c.title) {
        renameConversationLocally(c.id, title);
        try {
          await renameConversation(c.id, title);
        } catch {
          /* stale row — ignore */
        }
      }
    });

  const moveToMatter = (c: Conversation, matterId: string | null) =>
    start(async () => {
      updateConversationMatterLocally(c.id, matterId);
      setMovingId(null);
      try {
        await moveConversationToMatter(c.id, matterId);
      } catch {
        /* leave the row visible; the next refresh restores the server state */
      }
    });

  const share = async (c: Conversation) => {
    const url = `${window.location.origin}${vakilHref(c.vakilId, c.id)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setSharedId(c.id);
    setMenuOpenId(null);
    window.setTimeout(() => setSharedId((v) => (v === c.id ? null : v)), 2000);
  };

  const renderChat = (c: Conversation, opts: { nested?: boolean; matterId?: string; hidden?: boolean } = {}) => {
    const { nested = false, matterId, hidden = false } = opts;
    const d = dotById.get(c.vakilId);
    if (!d) return null;
    if (confirming === c.id) {
      return (
        <div key={c.id} className="my-0.5 flex items-center gap-2 rounded-lg bg-destructive/[0.06] px-3 py-2.5">
          <span className="min-w-0 flex-1 truncate text-[13px] text-destructive">Delete “{c.title}”?</span>
          <button className="btn-quiet h-7 px-2 text-[12px] text-destructive" onClick={() => remove(c)}>
            Delete
          </button>
          <button className="btn-quiet size-7 p-0" onClick={() => setConfirming(null)} aria-label="Cancel">
            <X className="size-3.5" strokeWidth={2} />
          </button>
        </div>
      );
    }
    const line = nested ? "" : preview(messages, c.id);
    const pinned = pinnedIds.includes(c.id);
    const archived = archivedIds.includes(c.id);
    const menuOpen = menuOpenId === c.id;
    const renaming = renamingId === c.id;
    const active = c.id === activeConv;
    const href = matterId ? `${vakilHref(d.id, c.id)}&matter=${encodeURIComponent(matterId)}` : vakilHref(d.id, c.id);
    return (
      <div
        key={c.id}
        className={`group relative flex items-center rounded-lg transition-colors ${nested ? "" : "my-0.5"} ${menuOpen ? "z-40" : "z-0 hover:z-10"} ${active ? "bg-highlight" : "hover:bg-highlight"}`}
      >
        {active && <span className={`absolute w-0.5 rounded-[999px] bg-brand ${nested ? "top-2 bottom-2 -left-[9px]" : "top-2.5 bottom-2.5 left-0"}`} aria-hidden="true" />}
        <Link href={href} onClick={() => markRead(d.id)} tabIndex={hidden ? -1 : 0} className={`flex min-w-0 flex-1 items-center gap-3 ${nested ? "px-2.5 py-1.5" : "px-2.5 py-2"}`}>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              {renaming ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onClick={(e) => e.preventDefault()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename(c);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  onBlur={() => saveRename(c)}
                  aria-label="Rename chat"
                  className="min-w-0 flex-1 rounded-md border border-brand/50 bg-card px-1.5 py-0.5 text-[14px] font-medium outline-none"
                />
              ) : (
                <span className={`truncate ${nested ? `text-[13px] ${active ? "font-medium text-foreground" : "text-foreground/70 group-hover:text-foreground"}` : "text-[14px] font-medium"}`}>{c.title || "Untitled chat"}</span>
              )}
              {pinned && !renaming && <Pin className="size-3 shrink-0 text-foreground/40" strokeWidth={2} />}
              {unread(c) && <span className="size-2 shrink-0 self-center rounded-full bg-brand" />}
              {(!nested || sharedId === c.id) && (
                <span className="ml-auto shrink-0 font-mono text-[10px] text-foreground/55 group-hover:invisible">
                  {sharedId === c.id ? "Copied" : timeAgo(c.updatedAt).replace(" ago", "")}
                </span>
              )}
            </span>
            {(line || archived) && <span className="block truncate text-[12.5px] text-foreground/60">{archived ? "Archived" : line}</span>}
          </span>
        </Link>
        {/* Kebab → conversation options (fixed-position so scrolling or collapsing parents never clip it) */}
        <button
          data-conv-trigger={c.id}
          tabIndex={hidden ? -1 : 0}
          className={`absolute right-2 z-20 flex size-6 items-center justify-center rounded text-foreground/55 hover:bg-card hover:text-foreground ${nested ? "top-1.5" : "top-2"} ${
            menuOpen ? "flex text-foreground" : "hidden group-hover:flex focus-visible:flex"
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (menuOpen) return setMenuOpenId(null);
            const rect = e.currentTarget.getBoundingClientRect();
            const up = window.innerHeight - rect.bottom < 330 && rect.top > 330;
            setMenuPos({ left: Math.max(8, rect.right - 208), ...(up ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }) });
            setMenuOpenId(c.id);
          }}
          aria-label={`Options for ${c.title}`}
          aria-expanded={menuOpen}
          title="Options"
        >
          <Ellipsis className="size-4" strokeWidth={1.75} />
        </button>
        {menuOpen && menuPos && (
          <div
            ref={menuRef}
            data-conv-menu
            style={{ position: "fixed", ...menuPos }}
            className="z-[70] w-52 overflow-hidden rounded-xl border border-border bg-background py-1.5 text-foreground shadow-elevated animate-page-rise"
          >
            <MenuItem icon={<Pencil className="size-4" strokeWidth={1.75} />} label="Rename" onClick={() => (setDraft(c.title), setRenamingId(c.id), setMenuOpenId(null))} />
            <MenuItem
              icon={pinned ? <PinOff className="size-4" strokeWidth={1.75} /> : <Pin className="size-4" strokeWidth={1.75} />}
              label={pinned ? "Unpin" : "Pin"}
              onClick={() => (toggleFlag(c.id, "pinned", !pinned), setMenuOpenId(null))}
            />
            <div className="mx-3 my-1.5 h-px bg-highlight" />
            <MenuItem icon={<Upload className="size-4" strokeWidth={1.75} />} label="Share" onClick={() => void share(c)} />
            <MenuItem icon={<FolderKanban className="size-4" strokeWidth={1.75} />} label={c.matterId ? "Move to another matter" : "Move to matter"} onClick={() => (setMovingId(c.id), setMenuOpenId(null))} />
            <MenuItem
              icon={archived ? <ArchiveRestore className="size-4" strokeWidth={1.75} /> : <Archive className="size-4" strokeWidth={1.75} />}
              label={archived ? "Unarchive" : "Archive"}
              onClick={() => (toggleFlag(c.id, "archived", !archived), setMenuOpenId(null))}
            />
            <MenuItem icon={<Trash2 className="size-4 text-destructive" strokeWidth={1.75} />} label="Delete" danger onClick={() => (setMenuOpenId(null), setConfirming(c.id))} />
          </div>
        )}
      </div>
    );
  };

  const closeSearch = () => (setSearching(false), setQ(""));
  const displayName = user?.name || "Lirava user";
  const initials = displayName.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      {/* Phones / narrow windows: the sidebar is a drawer over a dimmed backdrop */}
      {drawerOpen && <div className="fixed inset-0 z-40 bg-black/25 animate-page-rise md:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside
        // Picking anything in the drawer closes it on mobile.
        onClickCapture={(e) => {
          if (typeof window !== "undefined" && window.innerWidth < 768) {
            if ((e.target as HTMLElement).closest("a")) {
              setSidebarOpen(false);
            }
          }
        }}
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col bg-card text-foreground shadow-2xl transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.2,0,0,1)] md:static md:z-auto md:bg-card md:shadow-none ${
          drawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${
          collapsed
            ? "md:w-0 md:min-w-0 md:max-w-0 md:opacity-0 md:pointer-events-none md:border-r-0"
            : "md:w-[280px] md:min-w-[280px] md:max-w-[280px] md:opacity-100 md:border-r md:border-border"
        } overflow-hidden w-[260px] max-w-[85vw]`}
      >
        <div className="flex h-full w-[280px] min-w-[280px] max-w-[280px] shrink-0 flex-col">
          {/* Header */}
          <div className="flex h-14 shrink-0 items-center gap-1 px-3">
            <Wordmark className="mr-auto pl-1" />
            <button
              type="button"
              className={`flex size-8 items-center justify-center text-foreground/60 transition-colors hover:text-foreground ${searching ? "text-foreground" : ""}`}
              onClick={() => (searching ? closeSearch() : setSearching(true))}
              title="Search chats"
              aria-label="Search chats"
            >
              <Search className="size-4" strokeWidth={1.75} />
            </button>
            <Link
              href={newChatHref}
              className="motion-card flex size-8 items-center justify-center rounded-lg text-foreground/60 transition-colors hover:bg-highlight hover:text-foreground"
              title="New chat"
              aria-label="New chat"
            >
              <SquarePen className="size-4" strokeWidth={1.75} />
            </Link>
            <button
              type="button"
              className="hidden size-8 items-center justify-center text-foreground/60 transition-colors hover:text-foreground md:flex"
              onClick={() => setSidebarCollapsed(true)}
              title="Close sidebar (Ctrl+B)"
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="size-4" strokeWidth={1.75} />
            </button>
          </div>

          {searching && (
            <div className="relative mx-3 mb-2 animate-page-rise">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-foreground/35" strokeWidth={1.75} />
              <input
                autoFocus
                className="field h-9 bg-popover pr-8 pl-8"
                aria-label="Search chats" placeholder="Search chats"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && closeSearch()}
              />
              <button className="absolute top-1/2 right-2.5 -translate-y-1/2 text-foreground/40 hover:text-foreground" onClick={closeSearch} aria-label="Close search">
                <X className="size-3.5" strokeWidth={1.75} />
              </button>
            </div>
          )}

          <Link
            href={newChatHref}
            className="mx-2 mb-5 flex h-8 items-center gap-2 rounded-lg bg-highlight px-3 text-[14px] font-medium text-foreground transition-colors hover:bg-highlight"
          >
            <SquarePen className="size-4" strokeWidth={1.75} />
            New chat
          </Link>

          <nav className="mx-2 mb-6 space-y-1">
            <Link
              href="/matters"
              className={`flex h-9 items-center gap-3 rounded-lg px-2.5 text-[14px] transition-colors ${pathname === "/matters" ? "bg-highlight text-foreground" : "text-foreground/80 hover:bg-highlight hover:text-foreground"}`}
            >
              <FolderKanban className="size-4" strokeWidth={1.75} />
              Cases &amp; Matters
            </Link>
            <Link
              href="/matters/new"
              className={`flex h-9 items-center gap-3 rounded-lg px-2.5 text-[14px] transition-colors ${pathname === "/matters/new" ? "bg-highlight text-foreground" : "text-foreground/80 hover:bg-highlight hover:text-foreground"}`}
            >
              <Scale className="size-4" strokeWidth={1.75} />
              Hand over a case
            </Link>
            <Link
              href="/artifacts"
              className={`flex h-9 items-center gap-3 rounded-lg px-2.5 text-[14px] transition-colors ${pathname === "/artifacts" ? "bg-highlight text-foreground" : "text-foreground/80 hover:bg-highlight hover:text-foreground"}`}
            >
              <Boxes className="size-4" strokeWidth={1.75} />
              Artifacts
            </Link>
          </nav>

          {!q && matters.length > 0 && (
            <section className="mb-5 px-2">
              <div className="flex items-center justify-between px-2.5 pb-1.5 text-[12px] font-medium text-foreground/60">
                <span>Matters</span>
                <Link href="/matters" className="text-[12px] text-foreground/55 transition-colors hover:text-foreground" aria-label="View all matters">View all</Link>
              </div>
              <div className="max-h-[38vh] space-y-0.5 overflow-y-auto">
                {matters.map((matter) => {
                  const expanded = expandedMatterIds.includes(matter.id);
                  const matterChats = conversations.filter((conversation) => conversation.matterId === matter.id).sort((a, b) => b.updatedAt - a.updatedAt);
                  const onMatterPage = pathname === `/matters/${matter.id}` || pathname === `/matters/${encodeURIComponent(matter.id)}`;
                  const hasActiveChat = matterChats.some((chat) => chat.id === activeConv);
                  return <div key={matter.id}>
                    <div className={`group flex items-center rounded-lg transition-colors ${onMatterPage ? "bg-highlight" : "hover:bg-highlight"}`}>
                      <button type="button" onClick={() => setExpandedMatterIds((current) => expanded ? current.filter((id) => id !== matter.id) : [...current, matter.id])} className="flex size-8 shrink-0 items-center justify-center text-foreground/55 transition-colors hover:text-foreground" aria-label={`${expanded ? "Collapse" : "Expand"} ${matter.title}`} aria-expanded={expanded}>
                        <ChevronRight className={`size-3.5 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} strokeWidth={2} />
                      </button>
                      <Link href={`/matters/${encodeURIComponent(matter.id)}`} className={`flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-1 text-[13.5px] transition-colors ${onMatterPage || hasActiveChat ? "font-medium text-foreground" : "text-foreground/80 hover:text-foreground"}`} title={matter.title}>
                        <Folder className={`size-3.5 shrink-0 ${hasActiveChat || onMatterPage ? "text-brand-readable" : "text-foreground/50"}`} strokeWidth={1.75} />
                        <span className="truncate">{matter.title}</span>
                      </Link>
                      {matterChats.length > 0 && <span className="mr-2 rounded-[999px] bg-highlight px-1.5 font-mono text-[10.5px] leading-5 text-foreground/60 group-hover:bg-card">{matterChats.length}</span>}
                    </div>
                    <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded && matterChats.length > 0 ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                      <div className="overflow-hidden">
                        <div className="ml-4 space-y-0.5 border-l border-border py-0.5 pl-2">
                          {matterChats.map((chat) => renderChat(chat, { nested: true, matterId: matter.id, hidden: !expanded }))}
                        </div>
                      </div>
                    </div>
                  </div>;
                })}
              </div>
            </section>
          )}

          {/* Recent chats */}
          {q && <div className="eyebrow shrink-0 px-4 pt-2 pb-1.5">Chats matching “{q}”</div>}
          {!q && <div className="px-4 pb-1.5 text-[12px] font-medium text-foreground/60">Chats</div>}
          <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {!loaded && <div className="px-2 py-2 text-body-sm text-foreground/45">Connecting…</div>}
            {recent.map((c) => renderChat(c))}
            {loaded && !recent.length && (
              <p className="px-3 py-6 text-center text-caption text-foreground/45">
                {q ? "No chats match." : "No chats yet. Start a new chat to begin."}
              </p>
            )}
            {archivedCount > 0 && !q && (
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className="mx-2 mb-2 flex w-[calc(100%-16px)] items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-foreground/50 transition-colors hover:bg-highlight hover:text-foreground"
              >
                <Archive className="size-3.5" strokeWidth={1.75} />
                {showArchived ? "Hide archived" : `Archived (${archivedCount})`}
              </button>
            )}
          </nav>

          {movingId && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4" onMouseDown={(event) => event.target === event.currentTarget && setMovingId(null)}>
              <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-4 text-foreground">
                <div className="mb-3 flex items-center justify-between"><h2 className="text-[15px] font-medium">Move chat to matter</h2><button type="button" onClick={() => setMovingId(null)} className="text-foreground/50 hover:text-foreground" aria-label="Close">×</button></div>
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  <button type="button" onClick={() => { const chat = conversations.find((item) => item.id === movingId); if (chat) moveToMatter(chat, null); }} className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-foreground/65 hover:bg-highlight hover:text-foreground">No matter</button>
                  {matters.map((matter) => <button key={matter.id} type="button" onClick={() => { const chat = conversations.find((item) => item.id === movingId); if (chat) moveToMatter(chat, matter.id); }} className="w-full truncate rounded-lg px-3 py-2 text-left text-[13px] hover:bg-highlight">{matter.title}</button>)}
                </div>
              </div>
            </div>
          )}

          <div ref={profileRef} className="relative shrink-0 border-t border-border p-2">
            {profileOpen && (
              <div role="menu" aria-label="Account menu" className="absolute right-2 bottom-[68px] z-50 w-[264px] overflow-hidden rounded-xl border border-border bg-background py-2 text-foreground shadow-elevated animate-page-rise">
                <div className="px-3 py-2.5">
                  <p className="truncate text-[13px] font-medium">{displayName}</p>
                  <p className="truncate pt-0.5 text-[12px] text-foreground/55">{user?.email || "Signed in to Lirava"}</p>
                </div>
                <div className="mx-3 my-1 h-px bg-highlight" />
                <Link role="menuitem" href="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-3 py-2 text-[14px] hover:bg-highlight"><Settings className="size-4" />Settings</Link>
                <div role="menuitem" aria-disabled="true" className="flex items-center gap-3 px-3 py-2 text-[14px] text-foreground/60"><Palette className="size-4" />Appearance <span className="ml-auto text-[12px]">Light</span></div>
                <div role="menuitem" aria-disabled="true" className="flex items-center gap-3 px-3 py-2 text-[14px] text-foreground/60"><Globe className="size-4" />Language <span className="ml-auto text-[12px]">English</span></div>
                <div role="menuitem" aria-disabled="true" className="flex items-center gap-3 px-3 py-2 text-[14px] text-foreground/60"><Keyboard className="size-4" />Keyboard shortcuts</div>
                <Link role="menuitem" href="/privacy" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 px-3 py-2 text-[14px] hover:bg-highlight"><ShieldCheck className="size-4" />Privacy</Link>
                <div className="mx-3 my-1 h-px bg-highlight" />
                <LogoutButton className="flex w-full items-center gap-3 px-3 py-2 text-[14px] text-foreground/80 transition-colors hover:bg-highlight hover:text-foreground disabled:opacity-40" icon={<LogOut className="size-4" />} />
              </div>
            )}
            <button type="button" aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-highlight">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-highlight text-[11px] font-semibold">{initials}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{displayName}</span><span className="block truncate text-[11px] text-foreground/50">{user?.role || "Account"}</span></span>
              <ChevronsUpDown className="size-4 text-foreground/55" />
            </button>
          </div>

          {/* Legacy utility links remain available for existing routes but are superseded by the account menu. */}
          <div className="hidden shrink-0 items-center gap-2 p-3">
            <Link
              href="/apps"
              className={`hidden h-10 flex-1 items-center justify-center gap-1.5 rounded-full border text-[13px] transition-colors ${pathname === "/apps" ? "border-foreground bg-card" : "border-border hover:border-border"}`}
            >
              <LayoutGrid className="size-3.5" strokeWidth={1.5} /> Apps
            </Link>
            <Link
              href="/landing"
              className="hidden size-10 shrink-0 items-center justify-center rounded-full border border-border transition-colors hover:border-border text-foreground/70 hover:text-foreground"
              title="Product Tour & Overview"
              aria-label="Product Tour"
            >
              <Globe className="size-4" strokeWidth={1.5} />
            </Link>
            <Link
              href="/settings"
              className={`relative flex size-10 items-center justify-center rounded-full border transition-colors ${pathname === "/settings" ? "border-foreground bg-card" : "border-border hover:border-border"}`}
              title={`Settings: ${connected ? "connected" : "reconnecting"}`}
              aria-label="Settings"
            >
              <Settings className="size-4" strokeWidth={1.5} />
              <span className={`absolute top-0.5 right-0.5 size-2 rounded-full ring-2 ring-background ${connected ? "bg-success" : "bg-foreground/25"}`} />
            </Link>
            <LogoutButton
              className="flex size-10 items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:border-border hover:text-foreground disabled:opacity-40"
              icon={<LogOut className="size-4" strokeWidth={1.5} />}
            />
          </div>
        </div>
      </aside>
    </>
  );
}

/** One row in the dark conversation options menu (matches the reference). */
function MenuItem({ icon, label, onClick, danger = false, trailing }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean; trailing?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13.5px] transition-colors hover:bg-highlight ${danger ? "text-destructive" : ""}`}
    >
      <span className="shrink-0 opacity-80">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </button>
  );
}
