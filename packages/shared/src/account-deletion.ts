import { z } from "zod";
import { accountDeletionStatuses } from "./privacy";

export const requestAccountDeletionSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export type RequestAccountDeletionInput = z.infer<
  typeof requestAccountDeletionSchema
>;

export const accountDeletionRequestRowSchema = z.object({
  id: z.string().uuid(),
  profile_id: z.string().uuid(),
  status: z.enum(accountDeletionStatuses),
  reason: z.string().nullable(),
  requested_at: z.string(),
  processed_at: z.string().nullable(),
  processor_note: z.string().nullable().optional(),
});

export type AccountDeletionRequestRow = z.infer<
  typeof accountDeletionRequestRowSchema
>;
