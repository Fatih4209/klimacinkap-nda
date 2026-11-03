import { z } from "zod";

/** TR mobile: +90… or 05… — normalized later by auth provider. */
export const phoneOtpRequestSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(10)
    .max(20)
    .regex(/^\+?[0-9\s-]{10,20}$/, "Geçerli telefon girin"),
});

export const phoneOtpVerifySchema = phoneOtpRequestSchema.extend({
  token: z.string().trim().min(4).max(12),
});

export type PhoneOtpRequest = z.infer<typeof phoneOtpRequestSchema>;
export type PhoneOtpVerify = z.infer<typeof phoneOtpVerifySchema>;

export function mapAuthOtpErrorMessage(error: { message?: string }): string {
  const msg = (error.message ?? "").toLowerCase();
  if (!error.message) return "Kimlik doğrulama başarısız.";
  if (msg.includes("unsupported phone") || msg.includes("sms")) {
    return "SMS Auth yapılandırılmamış veya desteklenmiyor (dış bağımlılık).";
  }
  if (msg.includes("invalid") && msg.includes("otp")) {
    return "Kod geçersiz veya süresi dolmuş.";
  }
  if (msg.includes("rate")) {
    return "Çok fazla deneme. Bir süre sonra tekrar deneyin.";
  }
  return error.message;
}
