import assert from "node:assert/strict";
import test from "node:test";
import { getPurchasedTotal } from "../app/lib/shoppingTotal.ts";

const item = (fields = {}) => ({
  comprado: "1", cantidad: "1", precioValue: null, precioTotalValue: null,
  ...fields,
});
test("only purchased products count; empty and pending lists total zero", () => {
  assert.deepEqual(getPurchasedTotal([]), { value: 0, purchasedCount: 0, pricedCount: 0, missingCount: 0 });
  assert.equal(getPurchasedTotal([item({ comprado: "", precioValue: 500 })]).value, 0);
  assert.equal(getPurchasedTotal([item({ precioValue: 500 }), item({ comprado: "0", precioValue: 900 })]).value, 500);
});
test("stored line totals take precedence over unit prices and quantities", () => {
  assert.equal(getPurchasedTotal([item({ cantidad: "3", precioValue: 333.33, precioTotalValue: 1000 })]).value, 1000);
});
test("fallback uses purchased quantity, including weight units and zero prices", () => {
  assert.deepEqual(getPurchasedTotal([
    item({ cantidad: "0.75", precioValue: 2500 }),
    item({ cantidad: "2", precioValue: 0 }),
  ]), { value: 1875, purchasedCount: 2, pricedCount: 2, missingCount: 0 });
});
test("missing or invalid amounts are reported rather than assumed free", () => {
  const result = getPurchasedTotal([
    item({ precioValue: 100 }), item(), item({ precioValue: NaN }),
    item({ precioValue: -1 }), item({ precioValue: 10, cantidad: "" }),
  ]);
  assert.deepEqual(result, { value: 100, purchasedCount: 5, pricedCount: 1, missingCount: 4 });
});
test("line amounts sum in cents without floating point noise", () => {
  assert.equal(getPurchasedTotal([item({ precioTotalValue: 0.1 }), item({ precioTotalValue: 0.2 })]).value, 0.3);
  assert.equal(getPurchasedTotal([item({ cantidad: "3", precioValue: 0.33333 })]).value, 1);
});
test("marking, unmarking and editing recompute from the current active list", () => {
  const items = [item({ comprado: "", precioValue: 100, cantidad: "2" })];
  assert.equal(getPurchasedTotal(items).value, 0);
  items[0].comprado = "1";
  assert.equal(getPurchasedTotal(items).value, 200);
  items[0].precioValue = 150;
  assert.equal(getPurchasedTotal(items).value, 300);
  items[0].comprado = "";
  assert.equal(getPurchasedTotal(items).value, 0);
  assert.equal(getPurchasedTotal([item({ precioTotalValue: 450 })]).value, 450);
});
test("product discounts are deducted before the list discount", () => {
  const total = getPurchasedTotal([
    item({ precioTotalValue: 200, discountType: "percent", discountValue: 25 }),
    item({ precioTotalValue: 50, discountType: "amount", discountValue: 75 }),
  ], { type: "amount", value: 20 });
  assert.deepEqual(total, {
    value: 130,
    purchasedCount: 2,
    pricedCount: 2,
    missingCount: 0,
    subtotal: 150,
    discount: 20,
  });
  assert.equal(getPurchasedTotal([
    item({ precioTotalValue: 50, discountType: "amount", discountValue: 75 }),
  ], { type: "percent", value: 50 }).value, 0);
});
