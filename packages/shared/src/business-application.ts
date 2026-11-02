import { z } from "zod";
import { serviceCategories } from "@klimacin/config";
import {
  businessApplicationStatusSchema,
  businessCategoryApprovalStatuses,
  type BusinessApplicationStatus,
} from "./roles";

const categoryIds = serviceCategories.map((c) => c.id) as [
  "klima",
  "su",
  "tup",
];

export const serviceCategoryIdSchema = z.enum(categoryIds);
export type ServiceCategoryId = z.infer<typeof serviceCategoryIdSchema>;

export const businessApplicationSchema = z.object({
  id: z.string().uuid().optional(),
  legalName: z.string().min(2).max(160),
  tradeName: z.string().min(2).max(160),
  taxId: z.string().min(10).max(11),
  phone: z.string().min(10).max(20),
  email: z.string().email(),
  cityCode: z.string().min(1),
  cityName: z.string().min(1),
  districtCode: z.string().min(1),
  districtName: z.string().min(1),
  categories: z.array(serviceCategoryIdSchema).min(1),
  /** Authorized service claim is separate from verified business approval. */
  claimsAuthorizedService: z.boolean().default(false),
  status: businessApplicationStatusSchema.default("draft"),
  notes: z.string().max(2000).optional(),
});

export type BusinessApplicationInput = z.infer<
  typeof businessApplicationSchema
>;

export const saveBusinessApplicationSchema = businessApplicationSchema
  .omit({ id: true, status: true })
  .extend({
    applicationId: z.string().uuid().optional(),
  });

export type SaveBusinessApplicationInput = z.infer<
  typeof saveBusinessApplicationSchema
>;

export const adminReviewDecisions = [
  "approve",
  "reject",
  "needs_info",
] as const;

export const adminReviewApplicationSchema = z.object({
  applicationId: z.string().uuid(),
  decision: z.enum(adminReviewDecisions),
  reviewerNote: z.string().max(1000).optional(),
  /** Activation still requires ≥1 approved category (enforced in DB). */
  activateBusiness: z.boolean().default(false),
});

export type AdminReviewApplicationInput = z.infer<
  typeof adminReviewApplicationSchema
>;

export type BusinessApplicationRow = {
  id: string;
  applicantProfileId: string;
  businessId: string | null;
  legalName: string;
  tradeName: string;
  taxId: string;
  phone: string;
  email: string;
  cityCode: string;
  cityName: string;
  districtCode: string;
  districtName: string;
  categories: ServiceCategoryId[];
  claimsAuthorizedService: boolean;
  status: BusinessApplicationStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export const categoryApprovalSchema = z.object({
  businessId: z.string().uuid(),
  categoryId: serviceCategoryIdSchema,
  status: z.enum(businessCategoryApprovalStatuses),
  reviewedAt: z.string().datetime().optional(),
  reviewerNote: z.string().max(1000).optional(),
});

export function mapApplicationErrorMessage(error: {
  message?: string;
}): string {
  const msg = error.message ?? "";
  if (msg.includes("APPLICATION_AUTH_REQUIRED")) {
    return "Oturum gerekli. Auth bypass yok.";
  }
  if (msg.includes("APPLICATION_ADMIN_REQUIRED")) {
    return "Yalnızca platform yönetici inceleyebilir. Açık admin kaydı yok.";
  }
  if (msg.includes("APPLICATION_CATEGORIES_REQUIRED")) {
    return "En az bir hizmet kategorisi seçin.";
  }
  if (msg.includes("APPLICATION_NOT_EDITABLE")) {
    return "Bu başvuru düzenlenemez (yalnızca taslak / bilgi bekleyen).";
  }
  if (msg.includes("APPLICATION_SUBMIT_FORBIDDEN")) {
    return "Başvuru gönderilemedi.";
  }
  if (msg.includes("APPLICATION_NOT_REVIEWABLE")) {
    return "Başvuru inceleme için uygun durumda değil.";
  }
  if (msg.includes("APPLICATION_NOT_FOUND")) {
    return "Başvuru bulunamadı.";
  }
  if (msg.includes("APPLICATION_INVALID_DECISION")) {
    return "Geçersiz inceleme kararı.";
  }
  return msg || "Başvuru işlemi başarısız.";
}
