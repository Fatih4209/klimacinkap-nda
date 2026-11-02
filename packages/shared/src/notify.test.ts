import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isPushProviderConfigured,
  mapNotifyErrorMessage,
  notificationRequiresServerRefresh,
  openIssueSchema,
  sendExpoPushMessage,
} from "./notify.js";

test("notification with order ref requires server refresh", () => {
  assert.equal(
    notificationRequiresServerRefresh({
      productOrderId: "11111111-1111-1111-1111-111111111111",
      klimaAppointmentId: null,
      jobAssignmentId: null,
    }),
    true,
  );
  assert.equal(
    notificationRequiresServerRefresh({
      productOrderId: null,
      klimaAppointmentId: null,
      jobAssignmentId: null,
    }),
    false,
  );
});

test("push provider not configured without token", () => {
  assert.equal(isPushProviderConfigured({}), false);
  assert.equal(isPushProviderConfigured({ expoAccessToken: "  " }), false);
  assert.equal(
    isPushProviderConfigured({ expoAccessToken: "expo_test_token" }),
    true,
  );
});

test("sendExpoPushMessage skips without claiming success", async () => {
  const result = await sendExpoPushMessage({
    to: "ExponentPushToken[x]",
    title: "t",
    body: "b",
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.skippedNoProvider, true);
    assert.equal(result.errorCode, "PUSH_PROVIDER_NOT_CONFIGURED");
  }
});

test("sendExpoPushMessage records real ticket id on success", async () => {
  const result = await sendExpoPushMessage({
    to: "ExponentPushToken[x]",
    title: "t",
    body: "b",
    expoAccessToken: "token",
    fetchImpl: async () =>
      new Response(JSON.stringify({ data: { id: "ticket-123", status: "ok" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.providerMessageId, "ticket-123");
  }
});

test("open issue schema enforces minimum text", () => {
  assert.equal(
    openIssueSchema.safeParse({
      subjectKind: "product_order",
      subjectId: "11111111-1111-1111-1111-111111111111",
      title: "ab",
      description: "short",
    }).success,
    false,
  );
});

test("maps fake push forbidden", () => {
  assert.match(
    mapNotifyErrorMessage({ message: "NOTIFY_FAKE_PUSH_FORBIDDEN" }),
    /gerçek sağlayıcı/i,
  );
});
