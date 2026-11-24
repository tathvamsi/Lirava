import { deleteArtifactLocally } from "@/lib/store";

/** Asks before deleting: a deleted document cannot be brought back. */
export function confirmDeleteArtifact(title: string): boolean {
  return window.confirm(`Delete “${title || "Untitled document"}”? This cannot be undone.`);
}

/**
 * Deletes an artifact on the server and removes it from the page. A document that is already gone (404) counts as deleted.
 * Returns an error message to show, or null on success.
 */
export async function deleteArtifact(id: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/artifacts/${encodeURIComponent(id)}`, { method: "DELETE", signal: AbortSignal.timeout(20000) });
    if (response.status === 401) return "Your session has expired. Log in again to delete this document.";
    if (!response.ok && response.status !== 404) return "We couldn’t delete this document. Please try again.";
    deleteArtifactLocally(id);
    return null;
  } catch {
    return "We couldn’t delete this document. Check your connection and try again.";
  }
}
