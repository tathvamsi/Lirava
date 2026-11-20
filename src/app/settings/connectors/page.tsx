import { Suspense } from "react";
import OpenSettingsRedirect from "@/components/settings/OpenSettingsRedirect";

export const metadata = { title: "Connectors · Lirava" };

export default function ConnectorsPage() {
  // The provider sends people back here after connecting; show the result in the settings dialog.
  return (
    <Suspense>
      <OpenSettingsRedirect tab="connections" />
    </Suspense>
  );
}
