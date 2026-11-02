import assert from "node:assert/strict";
import { test } from "node:test";
import { formatTryFromKurus, tryToKurus } from "./money.js";

test("converts TRY to kuruş", () => {
  assert.equal(tryToKurus(149), 14900);
  assert.equal(tryToKurus(10.5), 1050);
});

test("formats TRY from kuruş in tr-TR", () => {
  const formatted = formatTryFromKurus(14900);
  assert.match(formatted, /149/);
});
