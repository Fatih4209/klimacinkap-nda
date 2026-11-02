import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSupabaseClientEnv } from "./supabase-env";

let browserClient: SupabaseClient | null = null;

/**
 * Returns a Supabase client only when URL + anon key are present.
 * Never fabricates success when env is missing.
 */
export function getSupabaseBrowserClient(env: {
  url?: string;
  anonKey?: string;
}): SupabaseClient | null {
  const parsed = readSupabaseClientEnv(env);
  if (!parsed) {
    return null;
  }
  if (!browserClient) {
    browserClient = createClient(parsed.url, parsed.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return browserClient;
}

export function resetSupabaseBrowserClientForTests(): void {
  browserClient = null;
}
