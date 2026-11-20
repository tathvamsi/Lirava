import { Suspense } from "react";
import OpenSettingsRedirect from "@/components/settings/OpenSettingsRedirect";

export const metadata = { title: "Connections · Lirava" };

export default function ConnectionsPage() {
  return (
    <Suspense>
      <OpenSettingsRedirect tab="connections" />
    </Suspense>
  );
}
