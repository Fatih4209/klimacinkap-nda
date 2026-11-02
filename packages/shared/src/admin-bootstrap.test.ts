import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertBootstrapSecretConfigured,
  bootstrapAdminRequestSchema,
  secretsMatch,
} from "./admin-bootstrap.js";

test("bootstrap request requires long secret and uuid", () => {
  assert.equal(
    bootstrapAdminRequestSchema.safeParse({
      profileId: "11111111-1111-4111-8111-111111111111",
      bootstrapSecret: "short",
    }).success,
    false,
  );
  assert.equal(
    bootstrapAdminRequestSchema.safeParse({
      profileId: "11111111-1111-4111-8111-111111111111",
      bootstrapSecret: "long-enough-secret!!",
    }).success,
    true,
  );
});

test("missing env secret refuses bootstrap", () => {
  const r = assertBootstrapSecretConfigured(undefined);
  assert.equal(r.ok, false);
});

test("secretsMatch is length-safe", () => {
  assert.equal(secretsMatch("abcdef", "abcdef"), true);
  assert.equal(secretsMatch("abcdef", "abcdeg"), false);
  assert.equal(secretsMatch("abc", "abcd"), false);
});
