/**
 * Mobile + web surface identities for store / EAS builds.
 * Domain is a target only — do not assume DNS or universal links are live.
 */
export const mobileApps = {
  customer: {
    slug: "klimacin-kapida-customer",
    displayName: "Klimacın Kapıda",
    iosBundleId: "com.klimacinkapida.customer",
    androidPackage: "com.klimacinkapida.customer",
    scheme: "klimacinkapida",
    easProjectSlug: "klimacin-kapida-customer",
    version: "1.0.0",
  },
  staff: {
    slug: "klimacin-kapida-staff",
    displayName: "Klimacın Kapıda Personel",
    iosBundleId: "com.klimacinkapida.staff",
    androidPackage: "com.klimacinkapida.staff",
    scheme: "klimacinkapida-staff",
    easProjectSlug: "klimacin-kapida-staff",
    version: "1.0.0",
  },
} as const;

export type MobileAppSurface = keyof typeof mobileApps;

/**
 * Path prefixes intended for https://{domainTarget}/... once DNS exists.
 * Until then only custom schemes are wired; associatedDomains stay placeholders.
 */
export const deepLinkPaths = {
  /** Auth callback / magic — SMS Auth configures separately */
  authCallback: "/auth/callback",
  /** Open a klima request in customer app */
  klimaRequest: "/open/klima/talep",
  /** Open a product order */
  productOrder: "/open/siparis",
  /** Open assignment in staff app */
  staffAssignment: "/open/personel/gorev",
  /** Accept staff invite */
  staffInvite: "/open/personel/davet",
  privacy: "/gizlilik",
  accountDeletion: "/hesap-silme",
} as const;

export const buildProfiles = ["development", "preview", "production"] as const;
export type BuildProfile = (typeof buildProfiles)[number];
