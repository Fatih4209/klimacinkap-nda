import { z } from "zod";

/**
 * First platform-admin bootstrap is server-only:
 * - Next route checks ADMIN_BOOTSTRAP_SECRET
 * - Calls bootstrap_first_platform_admin via service_role
 * - Refuses if any platform_admin already exists
 * There is no public admin signup UI that creates admins without the secret.
 */

export const bootstrapAdminRequestSchema = z.object({
  /** Existing auth user / profiles.id — user must already exist via SMS Auth. */
  profileId: z.string().uuid(),
  bootstrapSecret: z.string().min(16).max(200),
});

export type BootstrapAdminRequest = z.infer<typeof bootstrapAdminRequestSchema>;

export function mapBootstrapErrorMessage(error: { message?: string }): string {
  const msg = error.message ?? "";
  if (msg.includes("BOOTSTRAP_ALREADY_DONE")) {
    return "İlk admin zaten oluşturulmuş. Açık admin kaydı yoktur.";
  }
  if (msg.includes("BOOTSTRAP_PROFILE_NOT_FOUND")) {
    return "Profil bulunamadı. Önce SMS Auth ile kullanıcı oluşmalı.";
  }
  if (msg.includes("BOOTSTRAP_PROFILE_REQUIRED")) {
    return "Profil kimliği gerekli.";
  }
  if (msg.includes("BOOTSTRAP_SECRET_INVALID")) {
    return "Bootstrap secret geçersiz veya yapılandırılmamış.";
  }
  return msg || "Bootstrap başarısız.";
}

export function assertBootstrapSecretConfigured(
  envSecret: string | undefined,
): { ok: true; secret: string } | { ok: false; error: string } {
  const secret = envSecret?.trim();
  if (!secret || secret.length < 16) {
    return {
      ok: false,
      error:
        "ADMIN_BOOTSTRAP_SECRET yapılandırılmadı. İlk admin açıktan oluşturulamaz.",
    };
  }
  return { ok: true, secret };
}

export function secretsMatch(
  provided: string,
  expected: string,
): boolean {
  if (provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < provided.length; i += 1) {
    mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}
