import { z } from "zod";

const clientEnvSchema = z.object({
  url: z.string().url(),
  anonKey: z.string().min(1),
});

export type SupabaseClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Parse client-safe Supabase env. Returns null when unset (honest empty state).
 * Never accepts service role keys.
 */
export function readSupabaseClientEnv(input: {
  url?: string;
  anonKey?: string;
}): SupabaseClientEnv | null {
  if (!input.url || !input.anonKey) {
    return null;
  }
  if (/service_role/i.test(input.anonKey)) {
    throw new Error("Service role key must not be used in client env");
  }
  return clientEnvSchema.parse({
    url: input.url,
    anonKey: input.anonKey,
  });
}
