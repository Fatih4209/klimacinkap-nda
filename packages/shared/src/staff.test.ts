import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assignStaffSchema,
  canShareLocation,
  isLocationLive,
  LIVE_LOCATION_MAX_AGE_SECONDS,
  mapStaffErrorMessage,
} from "./staff.js";

test("assign staff requires exactly one job target", () => {
  assert.equal(
    assignStaffSchema.safeParse({
      staffProfileId: "11111111-1111-1111-1111-111111111111",
    }).success,
    false,
  );
  assert.equal(
    assignStaffSchema.safeParse({
      staffProfileId: "11111111-1111-1111-1111-111111111111",
      klimaAppointmentId: "22222222-2222-2222-2222-222222222222",
      productOrderId: "33333333-3333-3333-3333-333333333333",
    }).success,
    false,
  );
  assert.equal(
    assignStaffSchema.safeParse({
      staffProfileId: "11111111-1111-1111-1111-111111111111",
      klimaAppointmentId: "22222222-2222-2222-2222-222222222222",
    }).success,
    true,
  );
});

test("location share only en_route/on_site", () => {
  assert.equal(canShareLocation("assigned"), false);
  assert.equal(canShareLocation("accepted"), false);
  assert.equal(canShareLocation("en_route"), true);
  assert.equal(canShareLocation("on_site"), true);
  assert.equal(canShareLocation("completed"), false);
  assert.equal(canShareLocation("cancelled"), false);
});

test("stale location is not live", () => {
  const now = Date.parse("2026-03-22T12:00:00.000Z");
  const fresh = new Date(now - 30_000).toISOString();
  const stale = new Date(
    now - (LIVE_LOCATION_MAX_AGE_SECONDS + 5) * 1000,
  ).toISOString();

  assert.equal(
    isLocationLive({
      status: "en_route",
      receivedAt: fresh,
      nowMs: now,
    }),
    true,
  );
  assert.equal(
    isLocationLive({
      status: "en_route",
      receivedAt: stale,
      nowMs: now,
    }),
    false,
  );
  assert.equal(
    isLocationLive({
      status: "completed",
      receivedAt: fresh,
      nowMs: now,
    }),
    false,
  );
});

test("maps already assigned error", () => {
  assert.match(
    mapStaffErrorMessage({ message: "STAFF_ALREADY_ASSIGNED" }),
    /aktif personel/i,
  );
});
