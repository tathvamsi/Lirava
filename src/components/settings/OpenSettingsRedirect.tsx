"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { openSettings, setConnectorResult } from "@/lib/settings-modal";

/**
 * For old settings addresses (and the page an app provider sends people back to after connecting):
 * goes to the home page and opens the settings dialog on the given tab. A "?result=connected|failed"
 * in the address is passed on so the Connections tab can say how the connection went.
 */
export default function OpenSettingsRedirect({ tab }: { tab: string }) {
  const router = useRouter();
  const result = useSearchParams().get("result");

  useEffect(() => {
    if (result === "connected" || result === "failed") setConnectorResult(result);
    router.replace("/");
    openSettings(tab);
  }, [router, result, tab]);

  return null;
}
