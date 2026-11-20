import { requireUser } from "@/lib/auth";
import KnowledgeLibrary from "@/components/knowledge/KnowledgeLibrary";

export default async function KnowledgePage() {
  await requireUser();
  return <KnowledgeLibrary />;
}
