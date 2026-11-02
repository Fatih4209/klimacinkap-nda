import { z } from "zod";
import { userRoleSchema } from "./roles";

export const profileSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1).max(120).nullable(),
  phone: z.string().min(10).max(20).nullable(),
  roles: z.array(userRoleSchema).min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Profile = z.infer<typeof profileSchema>;
