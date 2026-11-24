"use client";

import { useState } from "react";
import { Download, FileText, ListChecks, Scale, Trash2 } from "lucide-react";
import { setActiveArtifact, useStore } from "@/lib/store";
import { confirmDeleteArtifact, deleteArtifact } from "@/lib/artifacts/deleteArtifact";

export function ArtifactCard({ artifactId }: { artifactId: string }) {
  const artifacts = useStore((s) => s.artifacts);
  const artifact = artifacts.find((a) => a.id === artifactId);
  const activeId = useStore((s) => s.activeArtifactId);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  if (!artifact) return null;

  const remove = async () => {
    if (deleting || !confirmDeleteArtifact(artifact.title)) return;
    setDeleting(true);
    setDeleteError("");
    const error = await deleteArtifact(artifact.id);
    // On success the card disappears with the artifact; on failure it stays and says why.
    if (error) {
      setDeleteError(error);
      setDeleting(false);
    }
  };

  const isLegal = artifact.kind === "legal_paper" || artifact.kind === "contract";
  const isPlan = artifact.kind === "plan";
  const Icon = isPlan ? ListChecks : isLegal ? Scale : FileText;

  const openBoard = () => {
    setActiveArtifact(artifact.id);
  };

  const isSelected = activeId === artifact.id;

  // Keep the available document formats visible at a glance.
  const formats: string[] = [];
  if (artifact.pdfFileId) formats.push("PDF");
  if (artifact.docxFileId) formats.push("Word");
  if (!formats.length) formats.push(isLegal ? "Legal Paper" : "Markdown");
  const subtitle = isPlan ? "Plan · tick off actions as you go" : isLegal ? "Document · open to read and edit" : `Document: ${formats.join(", ")}`;

  // Primary download target: a document or plan is exported from its current text, so edits are included.
  const exportHref = isPlan || isLegal ? `/api/artifacts/${encodeURIComponent(artifact.id)}/export?format=pdf` : null;
  const primaryDownloadId = exportHref ? null : artifact.pdfFileId || artifact.docxFileId || artifact.fileId;

  return (
    <div
      onClick={openBoard}
      className={`group my-3 flex items-center justify-between gap-3.5 rounded-2xl border p-3 sm:px-4 sm:py-3.5 transition-colors cursor-pointer ${
        isSelected
          ? "border-brand bg-brand/[0.04] ring-1 ring-brand/30 shadow-xs"
          : "border-black/10 bg-card hover:border-black/20 hover:bg-popover/80 hover:shadow-xs"
      }`}
      title="Click to view document in Artifact Board"
    >
      {/* Left Icon Square */}
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-black/[0.08] bg-black/[0.03] text-foreground/70 transition-colors group-hover:border-black/15 group-hover:bg-black/[0.05] group-hover:text-foreground">
        <Icon className="size-5" strokeWidth={1.5} />
      </div>

      {/* Center Title and Subtitle */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="truncate text-[14px] sm:text-[15px] font-medium tracking-tight text-foreground transition-colors group-hover:text-foreground">
            {artifact.title}
          </h4>
          {isSelected && (
            <span className="shrink-0 rounded-xs bg-brand/15 px-1.5 py-0.5 text-[10px] font-medium text-brand-readable">
              Open
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[12px] text-foreground/50">
          {subtitle}
        </p>
        {deleteError && <p role="alert" className="mt-1 text-[12px] text-red-600">{deleteError}</p>}
      </div>

      {/* Right Action Button(s) */}
      <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {exportHref && (
          <a href={exportHref} download className="btn-secondary h-8 px-3.5 text-[12px] sm:text-[13px] font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-2xs" title="Download PDF">
            <Download className="size-3.5 text-foreground/60" />
            <span>PDF</span>
          </a>
        )}
        {primaryDownloadId && (
          <a
            href={`/api/files/${primaryDownloadId}?download=1`}
            download
            className="btn-secondary h-8 px-3.5 text-[12px] sm:text-[13px] font-medium rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-2xs"
            title={artifact.pdfFileId ? "Download PDF" : "Download File"}
          >
            <Download className="size-3.5 text-foreground/60" />
            <span>Download</span>
          </a>
        )}

        {/* If DOCX is also present alongside PDF, provide quick Word download */}
        {artifact.pdfFileId && artifact.docxFileId && (
          <a
            href={`/api/files/${artifact.docxFileId}?download=1`}
            download
            className="btn-secondary h-8 px-2.5 text-[12px] font-normal rounded-lg inline-flex items-center gap-1 text-foreground/60 hover:text-foreground transition-colors"
            title="Download Word (.docx)"
          >
            <span>Word</span>
          </a>
        )}

        <button
          type="button"
          onClick={() => void remove()}
          disabled={deleting}
          title="Delete document"
          aria-label={`Delete ${artifact.title || "document"}`}
          className="btn-quiet size-8 shrink-0 rounded-lg text-foreground/50 hover:text-red-600 disabled:opacity-40"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
