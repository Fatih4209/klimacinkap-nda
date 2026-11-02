import { z } from "zod";
import { serviceCategories } from "@klimacin/config";
import {
  businessApplicationStatusSchema,
  businessCategoryApprovalStatuses,
} from "./roles";

const categoryIds = serviceCategories.map((c) => c.id) as [
  "klima",
  "su",
  "tup",
];

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
  categories: z.array(z.enum(categoryIds)).min(1),
  /** Authorized service claim is separate from verified business approval. */
  claimsAuthorizedService: z.boolean().default(false),
  status: businessApplicationStatusSchema.default("draft"),
  notes: z.string().max(2000).optional(),
});

export type BusinessApplicationInput = z.infer<
  typeof businessApplicationSchema
>;

export const categoryApprovalSchema = z.object({
  businessId: z.string().uuid(),
  categoryId: z.enum(categoryIds),
  status: z.enum(businessCategoryApprovalStatuses),
  reviewedAt: z.string().datetime().optional(),
  reviewerNote: z.string().max(1000).optional(),
});
