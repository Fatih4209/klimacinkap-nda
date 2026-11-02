import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ACCOUNT_DELETION_STEPS_TR,
  DATA_CATEGORIES,
  accountDeletionStatuses,
} from "./privacy.js";

test("privacy categories cover billing without claiming card storage", () => {
  const billing = DATA_CATEGORIES.find((c) => c.id === "billing");
  assert.ok(billing);
  assert.match(billing.fieldsTr.toLowerCase(), /kart/);
  assert.match(billing.fieldsTr, /yok/);
});

test("account deletion steps never claim instant wipe", () => {
  assert.ok(ACCOUNT_DELETION_STEPS_TR.length >= 4);
  const joined = ACCOUNT_DELETION_STEPS_TR.join(" ");
  assert.match(joined, /talep/i);
  assert.doesNotMatch(joined, /anında silinir|instant/i);
});

test("deletion statuses include pending before completed", () => {
  assert.ok(accountDeletionStatuses.includes("pending"));
  assert.ok(accountDeletionStatuses.includes("completed"));
});
