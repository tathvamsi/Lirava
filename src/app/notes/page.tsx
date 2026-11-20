import { requireUser } from "@/lib/auth";
import NotesLibrary from "@/components/notes/NotesLibrary";

export default async function NotesPage() {
  await requireUser();
  return <NotesLibrary />;
}
