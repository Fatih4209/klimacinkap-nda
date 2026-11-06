import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCustomSchemeUrl,
  buildHttpsDeepLinkUrl,
  parseCustomSchemeUrl,
} from "./deep-links.js";

const uuid = "11111111-1111-4111-8111-111111111111";

test("custom scheme round-trips for customer klima request", () => {
  const url = buildCustomSchemeUrl({
    surface: "customer",
    kind: "klimaRequest",
    requestId: uuid,
  });
  assert.equal(url, `klimacinkapida://klima/talep/${uuid}`);
  assert.deepEqual(parseCustomSchemeUrl(url), {
    surface: "customer",
    kind: "klimaRequest",
    requestId: uuid,
  });
});

test("staff assignment custom scheme parses", () => {
  const url = buildCustomSchemeUrl({
    surface: "staff",
    kind: "assignment",
    assignmentId: uuid,
  });
  assert.deepEqual(parseCustomSchemeUrl(url), {
    surface: "staff",
    kind: "assignment",
    assignmentId: uuid,
  });
});

test("https builder uses domain target without claiming DNS is live", () => {
  const url = buildHttpsDeepLinkUrl({ surface: "customer", kind: "privacy" });
  assert.equal(url, "https://klimacinkapida.com/gizlilik");
});

test("product order custom scheme includes optional category", () => {
  const withCat = buildCustomSchemeUrl({
    surface: "customer",
    kind: "productOrder",
    orderId: uuid,
    category: "su",
  });
  assert.equal(withCat, `klimacinkapida://siparis/su/${uuid}`);
  assert.deepEqual(parseCustomSchemeUrl(withCat), {
    surface: "customer",
    kind: "productOrder",
    category: "su",
    orderId: uuid,
  });

  const bare = buildCustomSchemeUrl({
    surface: "customer",
    kind: "productOrder",
    orderId: uuid,
  });
  assert.deepEqual(parseCustomSchemeUrl(bare), {
    surface: "customer",
    kind: "productOrder",
    orderId: uuid,
  });
});

test("staff invite custom scheme round-trips", () => {
  const token = "abcdef0123456789";
  const url = buildCustomSchemeUrl({
    surface: "staff",
    kind: "invite",
    inviteToken: token,
  });
  assert.equal(url, `klimacinkapida-staff://davet/${token}`);
  assert.deepEqual(parseCustomSchemeUrl(url), {
    surface: "staff",
    kind: "invite",
    inviteToken: token,
  });
});
