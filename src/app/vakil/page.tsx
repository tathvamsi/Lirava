import { redirect } from "next/navigation";
import { fetchAgents } from "@/lib/backend-client";
import { getSessionUser } from "@/lib/auth";

export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vakil");

  const dots = await fetchAgents(user.id);
  const vakil = dots.find((d) => d.name.toLowerCase() === "vakil" || d.id.startsWith("vakil_")) ?? dots[0];
  if (vakil) {
    redirect(`/vakil/${vakil.id}`);
  }
  redirect("/");
}
