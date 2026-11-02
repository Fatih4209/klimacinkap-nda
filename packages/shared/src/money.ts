import { z } from "zod";

/** All monetary amounts stored as integer kuruş (1 TRY = 100 kuruş). */
export const kurusSchema = z
  .number()
  .int("Tutar kuruş cinsinden tam sayı olmalıdır")
  .nonnegative();

export type Kurus = z.infer<typeof kurusSchema>;

export function tryToKurus(tryAmount: number): Kurus {
  if (!Number.isFinite(tryAmount)) {
    throw new Error("Geçersiz tutar");
  }
  return Math.round(tryAmount * 100);
}

export function kurusToTry(kurus: Kurus): number {
  return kurus / 100;
}

export function formatTryFromKurus(
  kurus: Kurus,
  locale = "tr-TR",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "TRY",
  }).format(kurusToTry(kurus));
}
