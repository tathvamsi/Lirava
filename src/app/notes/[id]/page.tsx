import { requireUser } from "@/lib/auth";
import NoteEditor from "@/components/notes/NoteEditor";

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  return <NoteEditor id={id} />;
}
