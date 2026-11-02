import {
  getSupabaseBrowserClient,
  resolvePublicSupabaseEnv,
} from "@klimacin/shared";

export function getAdminSupabase() {
  return getSupabaseBrowserClient(resolvePublicSupabaseEnv());
}
