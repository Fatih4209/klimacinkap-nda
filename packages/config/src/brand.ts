/**
 * Central brand configuration for Klimacın Kapıda.
 * All surfaces must read name/slogan/domain from here — do not hardcode elsewhere.
 */
export const brand = {
  name: "Klimacın Kapıda",
  shortName: "Klimacın",
  slogan: "Klima servisi, su ve tüp. Tek uygulamayla kapında.",
  domainTarget: "klimacinkapida.com",
  locale: "tr-TR",
  timezoneDisplay: "Europe/Istanbul",
  currency: "TRY",
  currencyMinorUnit: "kurus",
} as const;

export type Brand = typeof brand;

/** Three primary service categories — always equal visual weight on home. */
export const serviceCategories = [
  {
    id: "klima",
    label: "Klima",
    description: "Bakım, montaj, sökme, gaz ve arıza.",
    accentToken: "klima",
  },
  {
    id: "su",
    label: "Su",
    description: "Damacana su — marka, hacim, depozito.",
    accentToken: "su",
  },
  {
    id: "tup",
    label: "Tüp",
    description: "Tüp siparişi — net ürün kartı.",
    accentToken: "tup",
  },
] as const;

export type ServiceCategoryId = (typeof serviceCategories)[number]["id"];

export function assertBrandSpelling(value: string): boolean {
  return value === brand.name;
}
