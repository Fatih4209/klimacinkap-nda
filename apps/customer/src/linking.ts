import { useEffect, useState } from "react";
import { Linking } from "react-native";
import {
  parseCustomSchemeUrl,
  type DeepLinkTarget,
} from "@klimacin/shared";

/**
 * Listens for custom-scheme deep links. HTTPS universal links need DNS +
 * AASA/assetlinks (not claimed live here).
 */
export function useCustomerDeepLink(): DeepLinkTarget | null {
  const [target, setTarget] = useState<DeepLinkTarget | null>(null);

  useEffect(() => {
    function handle(url: string | null | undefined) {
      if (!url) return;
      const parsed = parseCustomSchemeUrl(url);
      if (parsed?.surface === "customer") {
        setTarget(parsed);
      }
    }

    void Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener("url", (e) => handle(e.url));
    return () => sub.remove();
  }, []);

  return target;
}
