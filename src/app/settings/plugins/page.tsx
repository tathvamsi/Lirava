import { Suspense } from "react";
import OpenSettingsRedirect from "@/components/settings/OpenSettingsRedirect";

export const metadata = { title: "Plugins · Lirava" };

export default function PluginsPage() {
  return (
    <Suspense>
      <OpenSettingsRedirect tab="connections" />
    </Suspense>
  );
}
