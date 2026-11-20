import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "The upload could not be read." }, { status: 400 });
  }
  // The backend checks type, size and contents, and stores the files against the signed-in user.
  return proxyToBackend(`/api/knowledge-bases/${encodeURIComponent(id)}/files`, { method: "POST", body: formData, timeoutMs: 180_000 });
}
