import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createKlimaRequestSchema,
  mapKlimaErrorMessage,
  sortKlimaOffers,
  submitKlimaOfferSchema,
  totalOfferKurus,
  type KlimaOfferComparison,
} from "./klima.js";

const baseOffer = (
  overrides: Partial<KlimaOfferComparison>,
): KlimaOfferComparison => ({
  offerId: "11111111-1111-1111-1111-111111111111",
  businessId: "22222222-2222-2222-2222-222222222222",
  tradeName: "Örnek",
  priceKurus: 10000,
  diagnosisFeeKurus: 0,
  scopeSummary: "Bakım kapsamı net",
  etaMinutes: 60,
  completedCount: 0,
  ratingAverage: null,
  ...overrides,
});

test("create request rejects short description", () => {
  const result = createKlimaRequestSchema.safeParse({
    addressId: "11111111-1111-1111-1111-111111111111",
    jobType: "bakim",
    description: "kısa",
    cityCode: "34",
    cityName: "İstanbul",
    districtCode: "3401",
    districtName: "Kadıköy",
  });
  assert.equal(result.success, false);
});

test("offer schema requires explicit diagnosis fee", () => {
  const missing = submitKlimaOfferSchema.safeParse({
    requestId: "11111111-1111-1111-1111-111111111111",
    businessId: "22222222-2222-2222-2222-222222222222",
    priceKurus: 15000,
    scopeSummary: "Gaz dolumu dahil teşhis",
    etaMinutes: 45,
  });
  assert.equal(missing.success, false);

  const ok = submitKlimaOfferSchema.safeParse({
    requestId: "11111111-1111-1111-1111-111111111111",
    businessId: "22222222-2222-2222-2222-222222222222",
    priceKurus: 15000,
    diagnosisFeeKurus: 0,
    scopeSummary: "Gaz dolumu dahil teşhis",
    etaMinutes: 45,
  });
  assert.equal(ok.success, true);
});

test("sorts offers by total price including diagnosis", () => {
  const sorted = sortKlimaOffers(
    [
      baseOffer({
        offerId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        priceKurus: 9000,
        diagnosisFeeKurus: 3000,
        etaMinutes: 30,
      }),
      baseOffer({
        offerId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        priceKurus: 10000,
        diagnosisFeeKurus: 0,
        etaMinutes: 90,
      }),
    ],
    "price",
  );
  assert.equal(sorted[0]?.offerId, "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
  assert.equal(totalOfferKurus(sorted[0]!), 10000);
});

test("maps region closed rpc errors for customers", () => {
  assert.match(
    mapKlimaErrorMessage({ message: "KLIMA_REGION_CLOSED" }),
    /bölgede klima/i,
  );
});
