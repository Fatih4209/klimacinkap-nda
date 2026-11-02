import assert from "node:assert/strict";
import { test } from "node:test";
import {
  availableStock,
  mapCatalogErrorMessage,
  orderPayableKurus,
  placeProductOrderSchema,
  upsertCatalogProductSchema,
} from "./catalog.js";

test("su product requires brand and volume", () => {
  const missing = upsertCatalogProductSchema.safeParse({
    businessId: "11111111-1111-1111-1111-111111111111",
    category: "su",
    name: "Damacana",
    unitPriceKurus: 9000,
  });
  assert.equal(missing.success, false);

  const ok = upsertCatalogProductSchema.safeParse({
    businessId: "11111111-1111-1111-1111-111111111111",
    category: "su",
    name: "Damacana 19L",
    brand: "ÖrnekSu",
    volumeLiters: 19,
    unitPriceKurus: 9000,
    depositKurus: 5000,
    requiresEmptyReturn: true,
    initialStock: 10,
  });
  assert.equal(ok.success, true);
});

test("tup product rejects install guidance in description", () => {
  const bad = upsertCatalogProductSchema.safeParse({
    businessId: "11111111-1111-1111-1111-111111111111",
    category: "tup",
    name: "12 kg tüp",
    sizeLabel: "12 kg",
    unitPriceKurus: 120000,
    description: "Evinizde vanayı bağlayın ve kurulum yapın",
  });
  assert.equal(bad.success, false);

  const ok = upsertCatalogProductSchema.safeParse({
    businessId: "11111111-1111-1111-1111-111111111111",
    category: "tup",
    name: "12 kg tüp",
    sizeLabel: "12 kg",
    unitPriceKurus: 120000,
    description: "Dolum tüpü — net ürün kartı",
  });
  assert.equal(ok.success, true);
});

test("available stock never goes negative in helper", () => {
  assert.equal(availableStock(5, 2), 3);
  assert.equal(availableStock(2, 5), 0);
});

test("order payable includes deposit", () => {
  assert.equal(
    orderPayableKurus({ subtotalKurus: 9000, depositKurusTotal: 5000 }),
    14000,
  );
});

test("place order schema requires items", () => {
  const empty = placeProductOrderSchema.safeParse({
    businessId: "11111111-1111-1111-1111-111111111111",
    addressId: "22222222-2222-2222-2222-222222222222",
    category: "su",
    paymentMethod: "cash_on_delivery",
    items: [],
  });
  assert.equal(empty.success, false);
});

test("maps insufficient stock rpc error", () => {
  assert.match(
    mapCatalogErrorMessage({ message: "CATALOG_INSUFFICIENT_STOCK" }),
    /Yetersiz stok/i,
  );
});
