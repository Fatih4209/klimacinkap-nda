/** Resolve client env from Expo or Next public variables. */
export function resolvePublicSupabaseEnv(): {
  url?: string;
  anonKey?: string;
} {
  return {
    url:
      process.env.EXPO_PUBLIC_SUPABASE_URL ??
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}
