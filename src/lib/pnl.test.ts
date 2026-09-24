import assert from "node:assert/strict";
import test from "node:test";
import { pnlFigureKey, presentPnl, type PnlInputRow } from "./pnl";

const fixture: PnlInputRow[] = [
  {
    id: "acc_food",
    name: "מזון",
    kind: "EXPENSE",
    documents: 4,
    amount: 1280.55,
    children: [
      { id: "acc_food_produce", name: "ירקות", documents: 3, amount: 800.5 },
      { id: "acc_food_dough", name: "בצק", documents: 1, amount: 480.05 },
    ],
  },
  {
    id: "acc_income",
    name: "הכנסות",
    kind: "INCOME",
    documents: 2,
    amount: 15000,
    children: [
      { id: "acc_sales", name: "מכירות", documents: 2, amount: 15000 },
      { id: "acc_other", name: "אחר", documents: 0, amount: 0 },
    ],
  },
];

test("P&L presentation keeps every section, row, document count and amount", () => {
  const presented = presentPnl(fixture);
  const raw = fixture.flatMap((parent) => [
    { id: parent.id, documents: parent.documents, amount: parent.amount },
    ...parent.children.map((child) => ({ id: child.id, documents: child.documents, amount: child.amount })),
  ]);
  assert.deepEqual(
    presented.figures.map((figure) => ({ id: figure.id, documents: figure.documents, amount: figure.amount })),
    raw,
  );
  assert.deepEqual(
    presented.figures.map(pnlFigureKey),
    [
      "acc_food|4|1280.55",
      "acc_food_produce|3|800.5",
      "acc_food_dough|1|480.05",
      "acc_income|2|15000",
      "acc_sales|2|15000",
      "acc_other|0|0",
    ],
  );
  assert.equal(presented.figures[0].amount + 0, fixture[0].amount);
  assert.equal(presented.figures.find((row) => row.id === "acc_food_dough")?.amount, 480.05);
});
