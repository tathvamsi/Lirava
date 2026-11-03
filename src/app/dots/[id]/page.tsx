import { redirect } from "next/navigation";
import { fetchAgent } from "@/lib/backend-client";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; c?: string; matter?: string }>;
}) {
  const { id } = await params;
  const { tab, c, matter } = await searchParams;

  const dot =
    (await fetchAgent(id)) ||
    (id.startsWith("dot_") ? await fetchAgent(id.replace(/^dot_/, "vakil_")) : null) ||
    (id.startsWith("vakil_") ? await fetchAgent(id.replace(/^vakil_/, "dot_")) : null);

  const targetId = dot ? dot.id : (id.startsWith("dot_") ? id.replace(/^dot_/, "vakil_") : id);

  const qs = new URLSearchParams();
  if (typeof tab === "string") qs.set("tab", tab);
  if (typeof c === "string") qs.set("c", c);
  if (typeof matter === "string") qs.set("matter", matter);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  redirect(`/vakil/${targetId}${query}`);
}
