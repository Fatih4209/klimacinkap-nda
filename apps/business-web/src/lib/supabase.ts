import {
  getSupabaseBrowserClient,
  resolvePublicSupabaseEnv,
} from "@klimacin/shared";

export function getBusinessSupabase() {
  return getSupabaseBrowserClient(resolvePublicSupabaseEnv());
}
