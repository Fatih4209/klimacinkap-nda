import { z } from "zod";
import { kurusSchema } from "./money";

export const klimaJobTypes = [
  "bakim",
  "montaj",
  "sokme",
  "gaz",
  "ariza",
] as const;

export type KlimaJobType = (typeof klimaJobTypes)[number];

export const klimaJobTypeSchema = z.enum(klimaJobTypes);

export const klimaJobTypeLabelsTr: Record<KlimaJobType, string> = {
  bakim: "Bakım",
  montaj: "Montaj",
  sokme: "Sökme",
  gaz: "Gaz",
  ariza: "Arıza",
};

export const klimaRequestStatuses = [
  "draft",
  "open",
  "reserved",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "expired",
] as const;

export type KlimaRequestStatus = (typeof klimaRequestStatuses)[number];

export const klimaOfferStatuses = [
  "pending",
  "withdrawn",
  "accepted",
  "rejected",
  "expired",
] as const;

export type KlimaOfferStatus = (typeof klimaOfferStatuses)[number];

export const klimaAppointmentStatuses = [
  "hold",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "expired",
] as const;

export type KlimaAppointmentStatus = (typeof klimaAppointmentStatuses)[number];

export const klimaExtraWorkStatuses = [
  "proposed",
  "approved",
  "rejected",
  "cancelled",
] as const;

export type KlimaExtraWorkStatus = (typeof klimaExtraWorkStatuses)[number];

export const DEFAULT_KLIMA_HOLD_MINUTES = 15;

export const createKlimaRequestSchema = z
  .object({
    addressId: z.string().uuid(),
    jobType: klimaJobTypeSchema,
    description: z.string().trim().min(8).max(2000),
    preferredWindowStart: z.string().datetime().optional(),
    preferredWindowEnd: z.string().datetime().optional(),
    cityCode: z.string().min(1),
    cityName: z.string().min(1),
    districtCode: z.string().min(1),
    districtName: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    if (
      value.preferredWindowStart &&
      value.preferredWindowEnd &&
      value.preferredWindowEnd <= value.preferredWindowStart
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tercih edilen bitiş, başlangıçtan sonra olmalıdır",
        path: ["preferredWindowEnd"],
      });
    }
  });

export type CreateKlimaRequestInput = z.infer<typeof createKlimaRequestSchema>;

export const submitKlimaOfferSchema = z.object({
  requestId: z.string().uuid(),
  businessId: z.string().uuid(),
  priceKurus: kurusSchema,
  /** Always required — 0 is allowed, omission is not. */
  diagnosisFeeKurus: kurusSchema,
  scopeSummary: z.string().trim().min(8).max(2000),
  etaMinutes: z.number().int().positive().max(24 * 60),
  proposedStart: z.string().datetime().optional(),
  proposedEnd: z.string().datetime().optional(),
});

export type SubmitKlimaOfferInput = z.infer<typeof submitKlimaOfferSchema>;

export const klimaOfferComparisonSchema = z.object({
  offerId: z.string().uuid(),
  businessId: z.string().uuid(),
  tradeName: z.string(),
  priceKurus: kurusSchema,
  diagnosisFeeKurus: kurusSchema,
  scopeSummary: z.string(),
  etaMinutes: z.number().int().positive(),
  /** Real completed klima appointments only — never invented. */
  completedCount: z.number().int().nonnegative(),
  /** Null until a real rating system exists. */
  ratingAverage: z.number().min(0).max(5).nullable(),
});

export type KlimaOfferComparison = z.infer<typeof klimaOfferComparisonSchema>;

export type KlimaOfferSortKey = "price" | "eta" | "completed";

export function sortKlimaOffers(
  offers: KlimaOfferComparison[],
  sortBy: KlimaOfferSortKey,
): KlimaOfferComparison[] {
  const copy = [...offers];
  copy.sort((a, b) => {
    if (sortBy === "price") {
      const aTotal = a.priceKurus + a.diagnosisFeeKurus;
      const bTotal = b.priceKurus + b.diagnosisFeeKurus;
      return aTotal - bTotal || a.etaMinutes - b.etaMinutes;
    }
    if (sortBy === "eta") {
      return a.etaMinutes - b.etaMinutes || a.priceKurus - b.priceKurus;
    }
    return (
      b.completedCount - a.completedCount ||
      a.priceKurus + a.diagnosisFeeKurus - (b.priceKurus + b.diagnosisFeeKurus)
    );
  });
  return copy;
}

export function totalOfferKurus(offer: Pick<
  KlimaOfferComparison,
  "priceKurus" | "diagnosisFeeKurus"
>): number {
  return offer.priceKurus + offer.diagnosisFeeKurus;
}

export const klimaRpcErrors: Record<string, string> = {
  KLIMA_REGION_CLOSED:
    "Bu bölgede klima hizmeti açık değil; kesin randevu oluşturulamaz.",
  KLIMA_REQUEST_NOT_FOUND: "Talep bulunamadı.",
  KLIMA_OFFER_NOT_FOUND: "Teklif bulunamadı.",
  KLIMA_APPOINTMENT_NOT_FOUND: "Randevu bulunamadı.",
  KLIMA_FORBIDDEN: "Bu işlem için yetkiniz yok.",
  KLIMA_AUTH_REQUIRED: "Giriş yapmanız gerekiyor.",
  KLIMA_INVALID_STATE: "İşlem bu durumda yapılamaz.",
  KLIMA_REQUEST_NOT_OPEN: "Talep teklife açık değil.",
  KLIMA_BUSINESS_NOT_ELIGIBLE:
    "İşletme klima kategorisinde onaylı ve aktif değil.",
  KLIMA_OUT_OF_AREA: "İşletme bu bölgede hizmet vermiyor.",
  KLIMA_OFFER_NOT_PENDING: "Teklif artık geçerli değil.",
  KLIMA_HOLD_EXPIRED: "Geçici rezervasyon süresi doldu.",
  KLIMA_NOT_ON_HOLD: "Randevu onay bekleyen rezervasyon değil.",
  KLIMA_EXTRA_PENDING:
    "Onay bekleyen ek iş varken randevu tamamlanamaz.",
  KLIMA_EXTRA_NOT_FOUND: "Ek iş kalemi bulunamadı.",
  KLIMA_EXTRA_NOT_PROPOSED: "Ek iş zaten karara bağlanmış.",
};

export function mapKlimaErrorMessage(error: {
  message?: string;
  code?: string;
}): string {
  const message = error.message ?? "";
  for (const [code, tr] of Object.entries(klimaRpcErrors)) {
    if (message.includes(code)) {
      return tr;
    }
  }
  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}
