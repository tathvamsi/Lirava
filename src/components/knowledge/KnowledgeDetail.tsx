"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, FileText, Trash2, Upload } from "lucide-react";
import { kbRequest, STATUS_LABEL, type KnowledgeBaseDetail } from "@/lib/knowledge-api";

/** One knowledge base: rename it, add documents (read page by page and indexed), remove them, or delete the lot. */
export default function KnowledgeDetail({ id, onBack }: { id: string; /** When given (inside the settings dialog), going back and deleting call this instead of navigating. */ onBack?: () => void }) {
  const router = useRouter();
  const [base, setBase] = useState<KnowledgeBaseDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void kbRequest<{ knowledgeBase: KnowledgeBaseDetail }>(`/api/knowledge-bases/${encodeURIComponent(id)}`).then((res) => {
      if (!active) return;
      if (res.ok) {
        setBase(res.data.knowledgeBase);
        setName(res.data.knowledgeBase.name);
        setDescription(res.data.knowledgeBase.description);
      } else setMissing(true);
    });
    return () => {
      active = false;
    };
  }, [id]);

  const save = async () => {
    if (!base || !name.trim()) return;
    setError("");
    const res = await kbRequest<{ knowledgeBase: KnowledgeBaseDetail }>(`/api/knowledge-bases/${encodeURIComponent(id)}`, { method: "PUT", body: { name, description } });
    if (res.ok) {
      setBase((b) => (b ? { ...b, name: res.data.knowledgeBase.name, description: res.data.knowledgeBase.description } : b));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } else setError(res.error);
  };

  const upload = async (list: File[]) => {
    if (!list.length || uploading) return;
    setUploading(true);
    setError("");
    const form = new FormData();
    for (const file of list) form.append("file", file);
    const res = await kbRequest<{ files: unknown[] }>(`/api/knowledge-bases/${encodeURIComponent(id)}/files`, { method: "POST", body: form });
    if (!res.ok) setError(res.error);
    // Reload: the server decides which files were indexed and how.
    const fresh = await kbRequest<{ knowledgeBase: KnowledgeBaseDetail }>(`/api/knowledge-bases/${encodeURIComponent(id)}`);
    if (fresh.ok) setBase(fresh.data.knowledgeBase);
    setUploading(false);
  };

  const removeFile = async (fileId: string) => {
    setError("");
    const res = await kbRequest(`/api/knowledge-bases/${encodeURIComponent(id)}/files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
    if (res.ok) setBase((b) => (b ? { ...b, fileCount: b.fileCount - 1, files: b.files.filter((f) => f.id !== fileId) } : b));
    else setError(res.error);
  };

  const deleteBase = async () => {
    const res = await kbRequest(`/api/knowledge-bases/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) {
      if (onBack) onBack();
      else router.push("/knowledge");
    }
    else {
      setConfirmDelete(false);
      setError(res.error);
    }
  };

  if (missing) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-16 text-center sm:px-8">
        <p className="text-foreground/60">This knowledge base was not found.</p>
        <Link href="/knowledge" className="mt-3 inline-block text-[13px] text-brand-readable hover:underline">
          Back to Knowledge
        </Link>
      </div>
    );
  }

  return (
    <div className={onBack ? "" : "flex-1 overflow-y-auto"}>
      <div className={onBack ? "" : "rails mx-auto min-h-full max-w-[880px] px-4 pb-16 sm:px-8"}>
        <div className={onBack ? "" : "pt-8"}>
          <Link href="/knowledge" onClick={onBack ? (e) => { e.preventDefault(); onBack(); } : undefined} className="inline-flex items-center gap-1.5 text-[13px] text-foreground/60 hover:text-foreground">
            <ArrowLeft className="size-3.5" strokeWidth={1.75} />
            Knowledge
          </Link>
        </div>

        {base === null ? (
          <p className="pt-8 text-body-sm text-foreground/45">Loading…</p>
        ) : (
          <>
            <form
              className="surface mt-5 grid gap-3 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <label className="block text-[12px] text-foreground/60">
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-[14px] text-foreground outline-none focus:border-brand/60" />
              </label>
              <label className="block text-[12px] text-foreground/60">
                What it is for
                <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-[13.5px] text-foreground outline-none focus:border-brand/60" />
              </label>
              <div className="flex items-center justify-end gap-3">
                {saved && <span className="text-[12.5px] text-success">Saved</span>}
                <button type="submit" disabled={!name.trim()} className="btn-primary h-9 px-3 text-[13px] disabled:opacity-40">
                  Save
                </button>
              </div>
            </form>

            <div className="mt-6 flex items-center gap-3">
              <h2 className="flex-1 text-[15px] font-medium">
                Documents <span className="font-mono text-[12px] text-foreground/50">{base.fileCount}</span>
              </h2>
              <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => { void upload([...(e.target.files ?? [])]); e.target.value = ""; }} />
              <button type="button" disabled={uploading} onClick={() => fileInput.current?.click()} className="btn-primary flex h-9 items-center gap-1.5 px-3 text-[13px] disabled:opacity-60">
                <Upload className="size-4" strokeWidth={1.75} />
                {uploading ? "Reading…" : "Add documents"}
              </button>
            </div>

            {error && (
              <p role="alert" className="mt-3 text-[12.5px] text-destructive">
                {error}
              </p>
            )}

            {base.files.length === 0 ? (
              <p className="mt-4 text-body-sm text-foreground/55">No documents yet. PDF, Word and text files are read page by page, so answers can cite the page.</p>
            ) : (
              <ul className="surface mt-4 divide-y divide-border">
                {base.files.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 p-3">
                    <FileText className="size-4 shrink-0 text-foreground/50" strokeWidth={1.5} />
                    <span className="min-w-0 flex-1">
                      <a href={`/api/files/${encodeURIComponent(f.id)}`} target="_blank" rel="noreferrer" className="block truncate text-[13.5px] hover:underline">
                        {f.name}
                      </a>
                      <span className={`block text-[12px] ${f.status === "ready" ? "text-foreground/50" : "text-warning"}`} title={f.note ?? undefined}>
                        {STATUS_LABEL[f.status]}
                        {f.status === "ready" && ` · ${f.pages} ${f.unit}${f.pages === 1 ? "" : "s"}`}
                      </span>
                    </span>
                    <button type="button" onClick={() => void removeFile(f.id)} aria-label={`Remove ${f.name}`} className="btn-quiet size-8 p-0">
                      <Trash2 className="size-3.5" strokeWidth={1.75} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-10 flex items-center justify-end gap-2 border-t border-border pt-6">
              {confirmDelete ? (
                <>
                  <span className="text-[12.5px] text-destructive">Delete this knowledge base and its {base.fileCount} documents?</span>
                  <button type="button" onClick={() => void deleteBase()} className="btn-quiet h-8 px-3 text-[13px] text-destructive">
                    Delete
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="btn-quiet h-8 px-3 text-[13px]">
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="btn-quiet h-8 px-3 text-[13px] text-foreground/60">
                  Delete knowledge base
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
