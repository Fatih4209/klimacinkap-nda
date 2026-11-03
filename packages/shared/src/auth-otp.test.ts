import assert from "node:assert/strict";
import { test } from "node:test";
import { phoneOtpRequestSchema, phoneOtpVerifySchema } from "./auth-otp.js";
import { requestPhoneOtp, verifyPhoneOtp } from "./auth-otp-api.js";

test("phone schema rejects short values", () => {
  assert.equal(phoneOtpRequestSchema.safeParse({ phone: "123" }).success, false);
  assert.equal(
    phoneOtpRequestSchema.safeParse({ phone: "+905551112233" }).success,
    true,
  );
});

test("verify schema requires token", () => {
  assert.equal(
    phoneOtpVerifySchema.safeParse({
      phone: "+905551112233",
      token: "12",
    }).success,
    false,
  );
});

test("null client never claims otp success", async () => {
  const req = await requestPhoneOtp(null, { phone: "+905551112233" });
  assert.equal(req.ok, false);
  const ver = await verifyPhoneOtp(null, {
    phone: "+905551112233",
    token: "123456",
  });
  assert.equal(ver.ok, false);
});
