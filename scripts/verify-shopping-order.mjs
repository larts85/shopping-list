import assert from "node:assert/strict";
import test from "node:test";
import { getOrderedShoppingGroups } from "../app/lib/shoppingOrder.ts";

const categories = ["vegetables", "bakery", "dairy", "empty"].map((id) => ({
  id,
}));
const item = (id, comprado = "0") => ({ id, comprado });

test("pending items and categories come first while ties retain their source order", () => {
  const list = {
    vegetables: [item("carrot", "1"), item("potato", "1")],
    bakery: [item("bread", "1"), item("bun"), item("toast", "1"), item("roll")],
    dairy: [item("milk"), item("cheese")],
    empty: [],
  };
  const original = structuredClone(list);
  const groups = getOrderedShoppingGroups(categories, list);
  assert.deepEqual(
    groups.map(({ category }) => category.id),
    ["bakery", "dairy", "vegetables"],
  );
  assert.deepEqual(
    groups[0].products.map(({ id }) => id),
    ["bun", "roll", "bread", "toast"],
  );
  assert.deepEqual(list, original);
});

test("checking the last pending item moves its category to the end; unchecking restores source order", () => {
  const list = {
    vegetables: [item("carrot", "1"), item("potato")],
    bakery: [item("bread")],
    dairy: [item("milk")],
  };
  list.vegetables[1].comprado = "1";
  const completed = getOrderedShoppingGroups(categories, list);
  assert.deepEqual(
    completed.map(({ category }) => category.id),
    ["bakery", "dairy", "vegetables"],
  );
  list.vegetables[1].comprado = "0";
  const pending = getOrderedShoppingGroups(categories, list);
  assert.deepEqual(
    pending.map(({ category }) => category.id),
    ["vegetables", "bakery", "dairy"],
  );
  assert.deepEqual(
    pending[0].products.map(({ id }) => id),
    ["potato", "carrot"],
  );
});

test("empty lists and missing categories produce no groups", () => {
  assert.deepEqual(getOrderedShoppingGroups(categories, {}), []);
  assert.deepEqual(
    getOrderedShoppingGroups([], { vegetables: [item("carrot")] }),
    [],
  );
});

test("all-pending and all-purchased lists retain category and item order", () => {
  for (const state of ["0", "1"]) {
    const list = {
      vegetables: [item("potato", state), item("carrot", state)],
      bakery: [item("bread", state)],
      dairy: [item("milk", state)],
    };
    const groups = getOrderedShoppingGroups(categories, list);
    assert.deepEqual(
      groups.map(({ category }) => category.id),
      ["vegetables", "bakery", "dairy"],
    );
    assert.deepEqual(
      groups[0].products.map(({ id }) => id),
      ["potato", "carrot"],
    );
  }
});
