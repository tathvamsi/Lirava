import { requireUser } from "@/lib/auth";
import KnowledgeDetail from "@/components/knowledge/KnowledgeDetail";

export default async function KnowledgeBasePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  return <KnowledgeDetail id={id} />;
}
