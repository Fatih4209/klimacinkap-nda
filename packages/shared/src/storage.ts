/**
 * Private storage helper stub for bucket `job-attachments`.
 * Uploads refuse without env/client — never invents public URLs.
 */
export const PRIVATE_JOB_ATTACHMENTS_BUCKET = "job-attachments";

export type StorageStubResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function buildPrivateObjectPath(
  profileId: string,
  filename: string,
): StorageStubResult<string> {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  if (!profileId || !safe) {
    return { ok: false, error: "Geçersiz depolama yolu." };
  }
  return { ok: true, data: `${profileId}/${safe}` };
}

export function refuseUploadWithoutClient(
  clientPresent: boolean,
): StorageStubResult<never> | null {
  if (!clientPresent) {
    return {
      ok: false,
      error:
        "Depolama istemcisi yok. Private bucket migration uygulanmalı; sahte URL üretilmez.",
    };
  }
  return null;
}
