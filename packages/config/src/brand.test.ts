import assert from "node:assert/strict";
import { test } from "node:test";
import { assertBrandSpelling, brand, serviceCategories } from "./brand.js";

test("brand spelling is Klimacın Kapıda", () => {
  assert.equal(brand.name, "Klimacın Kapıda");
  assert.equal(assertBrandSpelling("Klimacın Kapıda"), true);
  assert.equal(assertBrandSpelling("Klimacin Kapida"), false);
});

test("three categories are equal and ordered", () => {
  assert.equal(serviceCategories.length, 3);
  assert.deepEqual(
    serviceCategories.map((c) => c.id),
    ["klima", "su", "tup"],
  );
});

test("slogan mentions all three services", () => {
  const s = brand.slogan.toLowerCase();
  assert.match(s, /klima/);
  assert.match(s, /su/);
  assert.match(s, /tüp|tup/);
});
