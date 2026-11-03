import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cityNeedsManualDistrict,
  getTrCity,
  listTrDistricts,
  trCities,
} from "./tr-cities.js";

test("includes all 81 provinces", () => {
  assert.equal(trCities.length, 81);
  assert.ok(getTrCity("34")?.name.includes("stanbul"));
  assert.ok(getTrCity("06")?.name.includes("Ankara"));
});

test("istanbul has curated districts; obscure city allows manual", () => {
  assert.ok(listTrDistricts("34").length > 10);
  assert.equal(cityNeedsManualDistrict("34"), false);
  assert.equal(cityNeedsManualDistrict("69"), true);
});
