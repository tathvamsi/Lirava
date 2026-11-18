"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { Bold, Check, Heading2, Italic, List, ListOrdered, Loader2, Printer, Quote, Redo2, Underline as UnderlineIcon, Undo2 } from "lucide-react";
import type { DocumentArtifact } from "@/lib/types";
import { useArtifactSave, type SaveState } from "@/lib/artifacts/useArtifactSave";

const STATUS: Record<SaveState, string> = { saved: "Saved", dirty: "Editing…", saving: "Saving…", failed: "Could not save" };

/**
 * Document editor mode: a notice, draft or set of arguments the user can change in place. It reads the document
 * as markdown, edits it as formatted text, and saves it back as markdown a moment after each pause in typing.
 */
export function DocumentEditor({ artifact }: { artifact: DocumentArtifact }) {
  const { state, change, retry } = useArtifactSave(artifact.id);

  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: artifact.content,
    contentType: "markdown",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "court-paper-prose min-h-[60vh] space-y-4 text-[14px] leading-[1.8] text-paper-ink outline-none break-words",
        "aria-label": `Editing ${artifact.title}`,
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: e }) => change(e.getMarkdown()),
  });

  // Ctrl/Cmd+S saves now instead of waiting for the pause.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void retry();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [retry]);

  const tool = (label: string, Icon: typeof Bold, active: boolean, run: () => void, disabled = false) => (
    <button
      key={label}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
      className={`flex size-7 items-center justify-center rounded-md transition-colors disabled:opacity-40 ${active ? "bg-highlight text-foreground" : "text-foreground/60 hover:bg-highlight/60 hover:text-foreground"}`}
    >
      <Icon className="size-3.5" strokeWidth={2} />
    </button>
  );

  const chain = () => editor?.chain().focus();

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="flex shrink-0 items-center justify-between gap-2 overflow-x-auto border-b border-border bg-card px-3 py-1.5 sm:px-4">
        <div className="flex items-center gap-0.5" role="toolbar" aria-label="Formatting">
          {tool("Undo", Undo2, false, () => chain()?.undo().run(), !editor?.can().undo())}
          {tool("Redo", Redo2, false, () => chain()?.redo().run(), !editor?.can().redo())}
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          {tool("Heading", Heading2, !!editor?.isActive("heading"), () => chain()?.toggleHeading({ level: 2 }).run())}
          {tool("Bold", Bold, !!editor?.isActive("bold"), () => chain()?.toggleBold().run())}
          {tool("Italic", Italic, !!editor?.isActive("italic"), () => chain()?.toggleItalic().run())}
          {tool("Underline", UnderlineIcon, !!editor?.isActive("underline"), () => chain()?.toggleUnderline().run())}
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          {tool("Bulleted list", List, !!editor?.isActive("bulletList"), () => chain()?.toggleBulletList().run())}
          {tool("Numbered list", ListOrdered, !!editor?.isActive("orderedList"), () => chain()?.toggleOrderedList().run())}
          {tool("Quote", Quote, !!editor?.isActive("blockquote"), () => chain()?.toggleBlockquote().run())}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            role="status"
            className={`flex items-center gap-1.5 text-[12px] ${state === "failed" ? "text-danger" : "text-foreground/60"}`}
          >
            {state === "saving" ? <Loader2 className="size-3 animate-spin" /> : state === "saved" ? <Check className="size-3 text-success" /> : null}
            {STATUS[state]}
            {state === "failed" && (
              <button type="button" onClick={() => void retry()} className="underline underline-offset-2">
                Retry
              </button>
            )}
          </span>
          <button type="button" onClick={() => window.print()} className="btn-quiet h-7 gap-1 px-2 text-[12px]" title="Print">
            <Printer className="size-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-[760px] rounded-xl border border-border bg-card px-4 py-6 font-serif text-paper-ink shadow-md sm:px-10 sm:py-12">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
