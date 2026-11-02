import { useEffect, useState } from "react";
import { Linking } from "react-native";
import {
  parseCustomSchemeUrl,
  type DeepLinkTarget,
} from "@klimacin/shared";

export function useStaffDeepLink(): DeepLinkTarget | null {
  const [target, setTarget] = useState<DeepLinkTarget | null>(null);

  useEffect(() => {
    function handle(url: string | null | undefined) {
      if (!url) return;
      const parsed = parseCustomSchemeUrl(url);
      if (parsed?.surface === "staff") {
        setTarget(parsed);
      }
    }

    void Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener("url", (e) => handle(e.url));
    return () => sub.remove();
  }, []);

  return target;
}
