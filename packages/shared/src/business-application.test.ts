import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adminReviewApplicationSchema,
  mapApplicationErrorMessage,
  saveBusinessApplicationSchema,
} from "./business-application.js";

test("save application requires at least one category", () => {
  const parsed = saveBusinessApplicationSchema.safeParse({
    legalName: "Örnek Ltd",
    tradeName: "Örnek",
    taxId: "1234567890",
    phone: "+905551112233",
    email: "a@example.com",
    cityCode: "34",
    cityName: "İstanbul",
    districtCode: "34-1",
    districtName: "Kadıköy",
    categories: [],
  });
  assert.equal(parsed.success, false);
});

test("authorized service claim is optional and defaults false", () => {
  const parsed = saveBusinessApplicationSchema.parse({
    legalName: "Örnek Ltd",
    tradeName: "Örnek",
    taxId: "1234567890",
    phone: "+905551112233",
    email: "a@example.com",
    cityCode: "34",
    cityName: "İstanbul",
    districtCode: "34-1",
    districtName: "Kadıköy",
    categories: ["klima"],
  });
  assert.equal(parsed.claimsAuthorizedService, false);
});

test("admin review decisions are constrained", () => {
  assert.equal(
    adminReviewApplicationSchema.safeParse({
      applicationId: "11111111-1111-4111-8111-111111111111",
      decision: "approve",
    }).success,
    true,
  );
  assert.equal(
    adminReviewApplicationSchema.safeParse({
      applicationId: "11111111-1111-4111-8111-111111111111",
      decision: "auto_approve",
    }).success,
    false,
  );
});

test("maps auth required without inventing success", () => {
  assert.match(
    mapApplicationErrorMessage({ message: "APPLICATION_AUTH_REQUIRED" }),
    /Oturum/,
  );
});
