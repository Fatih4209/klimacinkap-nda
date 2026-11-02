import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildProfiles,
  deepLinkPaths,
  mobileApps,
} from "./apps.js";
import { brand } from "./brand.js";

test("customer and staff have distinct app ids and schemes", () => {
  assert.notEqual(
    mobileApps.customer.iosBundleId,
    mobileApps.staff.iosBundleId,
  );
  assert.notEqual(mobileApps.customer.scheme, mobileApps.staff.scheme);
  assert.match(mobileApps.customer.androidPackage, /^com\.klimacinkapida\./);
  assert.match(mobileApps.staff.androidPackage, /^com\.klimacinkapida\./);
});

test("display names use brand spelling", () => {
  assert.equal(mobileApps.customer.displayName, brand.name);
  assert.match(mobileApps.staff.displayName, /Klimacın Kapıda/);
});

test("build profiles cover dev/preview/production", () => {
  assert.deepEqual([...buildProfiles], [
    "development",
    "preview",
    "production",
  ]);
});

test("deep link privacy paths are relative (DNS not assumed)", () => {
  assert.equal(deepLinkPaths.privacy, "/gizlilik");
  assert.equal(deepLinkPaths.accountDeletion, "/hesap-silme");
});
