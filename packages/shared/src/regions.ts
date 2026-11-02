import { z } from "zod";
import { serviceCategoryIdSchema } from "./business-application";

export const upsertServiceRegionSchema = z.object({
  cityCode: z.string().min(1).max(10),
  cityName: z.string().min(1).max(80),
  districtCode: z.string().min(1).max(10),
  districtName: z.string().min(1).max(80),
  category: serviceCategoryIdSchema,
  isOpen: z.boolean(),
});

export type UpsertServiceRegionInput = z.infer<typeof upsertServiceRegionSchema>;

export type ServiceRegionRow = {
  id: string;
  cityCode: string;
  cityName: string;
  districtCode: string;
  districtName: string;
  category: z.infer<typeof serviceCategoryIdSchema>;
  isOpen: boolean;
};

export function mapRegionErrorMessage(error: { message?: string }): string {
  const msg = error.message ?? "";
  if (msg.includes("REGION_ADMIN_REQUIRED")) {
    return "Bölge yönetimi yalnızca platform yönetici içindir.";
  }
  return msg || "Bölge kaydı başarısız.";
}
