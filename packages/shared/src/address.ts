import { z } from "zod";

export const turkishAddressSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1).max(80).optional(),
  cityCode: z.string().min(1).max(10),
  cityName: z.string().min(1).max(80),
  districtCode: z.string().min(1).max(10),
  districtName: z.string().min(1).max(80),
  neighborhood: z.string().min(1).max(120).optional(),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  postalCode: z.string().max(10).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().default(false),
});

export type TurkishAddress = z.infer<typeof turkishAddressSchema>;
