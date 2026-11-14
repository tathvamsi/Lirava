import VakilView from "@/components/VakilView";
import { fetchVakil } from "@/lib/backend-client";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ c?: string; matter?: string }>;
}) {
  const { id } = await params;
  const { c, matter } = await searchParams;

  const vakil = await fetchVakil(id);
  const actualId = vakil ? vakil.id : id;

  return <VakilView vakilId={actualId} conversation={typeof c === "string" ? c : undefined} matterId={typeof matter === "string" ? matter : undefined} />;
}
