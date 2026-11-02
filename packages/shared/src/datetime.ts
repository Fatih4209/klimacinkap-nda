/** Persist UTC; display in Turkey time. */
export const DB_TIMEZONE = "UTC";
export const DISPLAY_TIMEZONE = "Europe/Istanbul";

export function formatTrDateTime(
  isoUtc: string,
  locale = "tr-TR",
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: DISPLAY_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoUtc));
}

export function nowUtcIso(): string {
  return new Date().toISOString();
}
