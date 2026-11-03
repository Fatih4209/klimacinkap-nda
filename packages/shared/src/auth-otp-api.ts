import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapAuthOtpErrorMessage,
  phoneOtpRequestSchema,
  phoneOtpVerifySchema,
  type PhoneOtpRequest,
  type PhoneOtpVerify,
} from "./auth-otp";

export type AuthOtpResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * Request SMS OTP. Never invents success without Supabase Auth response.
 */
export async function requestPhoneOtp(
  client: SupabaseClient | null,
  input: PhoneOtpRequest,
): Promise<AuthOtpResult<{ phone: string }>> {
  if (!client) {
    return {
      ok: false,
      error: "Supabase bağlı değil. SMS OTP gönderilmedi.",
    };
  }
  const parsed = phoneOtpRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz telefon",
    };
  }

  const { error } = await client.auth.signInWithOtp({
    phone: parsed.data.phone,
  });
  if (error) {
    return { ok: false, error: mapAuthOtpErrorMessage(error) };
  }
  return { ok: true, data: { phone: parsed.data.phone } };
}

export async function verifyPhoneOtp(
  client: SupabaseClient | null,
  input: PhoneOtpVerify,
): Promise<AuthOtpResult<{ userId: string }>> {
  if (!client) {
    return {
      ok: false,
      error: "Supabase bağlı değil. Kod doğrulanmadı (auth bypass yok).",
    };
  }
  const parsed = phoneOtpVerifySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Geçersiz kod",
    };
  }

  const { data, error } = await client.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.token,
    type: "sms",
  });
  if (error || !data.user?.id) {
    return {
      ok: false,
      error: mapAuthOtpErrorMessage(
        error ?? { message: "Oturum oluşmadı; sahte giriş yok." },
      ),
    };
  }
  return { ok: true, data: { userId: data.user.id } };
}

export async function signOutAuth(
  client: SupabaseClient | null,
): Promise<AuthOtpResult<{ signedOut: true }>> {
  if (!client) {
    return { ok: false, error: "Supabase bağlı değil." };
  }
  const { error } = await client.auth.signOut();
  if (error) {
    return { ok: false, error: mapAuthOtpErrorMessage(error) };
  }
  return { ok: true, data: { signedOut: true } };
}
