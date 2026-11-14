import { redirect } from "next/navigation";
import { fetchVakils } from "@/lib/backend-client";
import { getSessionUser } from "@/lib/auth";

export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/vakil");

  const vakils = await fetchVakils();
  const vakil = vakils.find((d) => d.name.toLowerCase() === "vakil" || d.id.startsWith("vakil_")) ?? vakils[0];
  if (vakil) {
    redirect(`/vakil/${vakil.id}`);
  }
  redirect("/");
}
