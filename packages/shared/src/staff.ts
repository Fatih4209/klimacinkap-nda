import { z } from "zod";

export const jobKinds = ["klima_appointment", "product_order"] as const;
export type JobKind = (typeof jobKinds)[number];
export const jobKindSchema = z.enum(jobKinds);

export const jobKindLabelsTr: Record<JobKind, string> = {
  klima_appointment: "Klima randevusu",
  product_order: "Su/Tüp siparişi",
};

export const assignmentStatuses = [
  "assigned",
  "accepted",
  "en_route",
  "on_site",
  "completed",
  "cancelled",
] as const;
export type AssignmentStatus = (typeof assignmentStatuses)[number];
export const assignmentStatusSchema = z.enum(assignmentStatuses);

export const assignmentStatusLabelsTr: Record<AssignmentStatus, string> = {
  assigned: "Atandı",
  accepted: "Kabul edildi",
  en_route: "Yolda",
  on_site: "Sahada",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

/** Server-side live threshold; keep in sync with SQL live_location_max_age_seconds(). */
export const LIVE_LOCATION_MAX_AGE_SECONDS = 90;

export const LOCATION_SHARE_STATUSES: AssignmentStatus[] = [
  "en_route",
  "on_site",
];

export function canShareLocation(status: AssignmentStatus): boolean {
  return LOCATION_SHARE_STATUSES.includes(status);
}

export function isLocationLive(input: {
  status: AssignmentStatus;
  receivedAt: string | null | undefined;
  nowMs?: number;
  maxAgeSeconds?: number;
}): boolean {
  if (!canShareLocation(input.status) || !input.receivedAt) {
    return false;
  }
  const received = Date.parse(input.receivedAt);
  if (Number.isNaN(received)) {
    return false;
  }
  const now = input.nowMs ?? Date.now();
  const maxAge =
    (input.maxAgeSeconds ?? LIVE_LOCATION_MAX_AGE_SECONDS) * 1000;
  return now - received <= maxAge;
}

export const assignStaffSchema = z.object({
  staffProfileId: z.string().uuid(),
  klimaAppointmentId: z.string().uuid().optional(),
  productOrderId: z.string().uuid().optional(),
}).superRefine((value, ctx) => {
  const hasKlima = Boolean(value.klimaAppointmentId);
  const hasOrder = Boolean(value.productOrderId);
  if (hasKlima === hasOrder) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Tam olarak bir iş hedefi gerekli",
    });
  }
});

export type AssignStaffInput = z.infer<typeof assignStaffSchema>;

export const staffLocationPingSchema = z.object({
  assignmentId: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().nonnegative().optional(),
  recordedAt: z.string().datetime().optional(),
});

export type StaffLocationPingInput = z.infer<typeof staffLocationPingSchema>;

export const completeAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
  completionCode: z.string().regex(/^\d{6}$/),
});

export type JobAssignment = {
  id: string;
  businessId: string;
  staffProfileId: string;
  kind: JobKind;
  klimaAppointmentId: string | null;
  productOrderId: string | null;
  status: AssignmentStatus;
  completionCode: string;
  assignedAt: string;
};

export const staffRpcErrors: Record<string, string> = {
  STAFF_AUTH_REQUIRED: "Giriş yapmanız gerekiyor.",
  STAFF_FORBIDDEN: "Bu işlem için yetkiniz yok.",
  STAFF_NOT_MEMBER: "Personel bu işletmenin aktif üyesi değil.",
  STAFF_JOB_NOT_FOUND: "İş bulunamadı.",
  STAFF_ASSIGNMENT_NOT_FOUND: "Atama bulunamadı.",
  STAFF_INVALID_JOB_STATE: "İş bu durumda personel atanamaz.",
  STAFF_ALREADY_ASSIGNED: "Bu işe zaten aktif personel atanmış.",
  STAFF_ASSIGNMENT_CLOSED: "Atama kapalı.",
  STAFF_INVALID_TRANSITION: "Geçersiz durum geçişi.",
  STAFF_USE_COMPLETE_RPC: "Tamamlama için kod gerekli.",
  STAFF_LOCATION_NOT_ALLOWED:
    "Konum yalnızca yolda veya sahadayken paylaşılır.",
  STAFF_BAD_COMPLETION_CODE: "Tamamlama kodu hatalı.",
  STAFF_PROFILE_NOT_FOUND: "Personel profili bulunamadı.",
};

export function mapStaffErrorMessage(error: { message?: string }): string {
  const message = error.message ?? "";
  for (const [code, tr] of Object.entries(staffRpcErrors)) {
    if (message.includes(code)) {
      return tr;
    }
  }
  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

/** Offline queue item for location pings (flush when online). */
export type PendingLocationPing = StaffLocationPingInput & {
  localId: string;
  queuedAt: string;
};
