import { requireUser } from "@/lib/auth";
import { ArtifactLibrary } from "@/components/artifacts/ArtifactLibrary";

export default async function ArtifactsPage() {
  await requireUser();
  return <ArtifactLibrary />;
}
