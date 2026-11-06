import { brand, deepLinkPaths, mobileApps } from "@klimacin/config";

export type DeepLinkTarget =
  | { surface: "customer"; kind: "home" }
  | { surface: "customer"; kind: "klimaRequest"; requestId: string }
  | {
      surface: "customer";
      kind: "productOrder";
      orderId: string;
      category?: "su" | "tup";
    }
  | { surface: "customer"; kind: "privacy" }
  | { surface: "customer"; kind: "accountDeletion" }
  | { surface: "staff"; kind: "home" }
  | { surface: "staff"; kind: "assignment"; assignmentId: string }
  | { surface: "staff"; kind: "invite"; inviteToken: string };

/** Custom-scheme URL for development builds (works without DNS). */
export function buildCustomSchemeUrl(target: DeepLinkTarget): string {
  const app = mobileApps[target.surface];
  switch (target.kind) {
    case "home":
      return `${app.scheme}://`;
    case "klimaRequest":
      return `${app.scheme}://klima/talep/${target.requestId}`;
    case "productOrder": {
      const cat = target.category ? `/${target.category}` : "";
      return `${app.scheme}://siparis${cat}/${target.orderId}`;
    }
    case "assignment":
      return `${app.scheme}://gorev/${target.assignmentId}`;
    case "invite":
      return `${app.scheme}://davet/${target.inviteToken}`;
    case "privacy":
      return `${app.scheme}://gizlilik`;
    case "accountDeletion":
      return `${app.scheme}://hesap-silme`;
    default: {
      const _exhaustive: never = target;
      return _exhaustive;
    }
  }
}

/**
 * HTTPS universal-link style URL — only valid after DNS + AASA/assetlinks.
 * Callers must not assume this resolves today.
 */
export function buildHttpsDeepLinkPath(target: DeepLinkTarget): string {
  switch (target.kind) {
    case "home":
      return "/";
    case "klimaRequest":
      return `${deepLinkPaths.klimaRequest}/${target.requestId}`;
    case "productOrder":
      return `${deepLinkPaths.productOrder}/${target.orderId}`;
    case "assignment":
      return `${deepLinkPaths.staffAssignment}/${target.assignmentId}`;
    case "invite":
      return `${deepLinkPaths.staffInvite}/${target.inviteToken}`;
    case "privacy":
      return deepLinkPaths.privacy;
    case "accountDeletion":
      return deepLinkPaths.accountDeletion;
    default: {
      const _exhaustive: never = target;
      return _exhaustive;
    }
  }
}

export function buildHttpsDeepLinkUrl(target: DeepLinkTarget): string {
  return `https://${brand.domainTarget}${buildHttpsDeepLinkPath(target)}`;
}

export function parseCustomSchemeUrl(
  url: string,
): DeepLinkTarget | null {
  try {
    const parsed = new URL(url);
    const customerScheme = mobileApps.customer.scheme;
    const staffScheme = mobileApps.staff.scheme;

    if (parsed.protocol === `${customerScheme}:`) {
      const path = `${parsed.host}${parsed.pathname}`.replace(/\/+$/, "");
      if (!path || path === "/") return { surface: "customer", kind: "home" };
      if (path === "gizlilik")
        return { surface: "customer", kind: "privacy" };
      if (path === "hesap-silme")
        return { surface: "customer", kind: "accountDeletion" };
      const klima = path.match(/^klima\/talep\/([0-9a-f-]{36})$/i);
      if (klima)
        return {
          surface: "customer",
          kind: "klimaRequest",
          requestId: klima[1]!,
        };
      const orderCat = path.match(/^siparis\/(su|tup)\/([0-9a-f-]{36})$/i);
      if (orderCat)
        return {
          surface: "customer",
          kind: "productOrder",
          category: orderCat[1]!.toLowerCase() as "su" | "tup",
          orderId: orderCat[2]!,
        };
      const order = path.match(/^siparis\/([0-9a-f-]{36})$/i);
      if (order)
        return {
          surface: "customer",
          kind: "productOrder",
          orderId: order[1]!,
        };
      return null;
    }

    if (parsed.protocol === `${staffScheme}:`) {
      const path = `${parsed.host}${parsed.pathname}`.replace(/\/+$/, "");
      if (!path || path === "/") return { surface: "staff", kind: "home" };
      const asg = path.match(/^gorev\/([0-9a-f-]{36})$/i);
      if (asg)
        return {
          surface: "staff",
          kind: "assignment",
          assignmentId: asg[1]!,
        };
      const invite = path.match(/^davet\/([a-f0-9]{16,})$/i);
      if (invite)
        return {
          surface: "staff",
          kind: "invite",
          inviteToken: invite[1]!,
        };
      return null;
    }

    return null;
  } catch {
    return null;
  }
}
