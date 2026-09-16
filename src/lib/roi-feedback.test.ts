import assert from "node:assert/strict";
import test from "node:test";
import { BILLED_AS, COMPANY } from "./constants";
import { creditAmountIls, isShortage, qtyDiffers } from "./credits";
import { nextOrderWindow } from "./format";
import { buildOrderHeaderLines } from "./order-header";
import { buildOrderWhatsAppText, buildWhatsAppUrl, toWhatsAppPhone } from "./whatsapp";

test("credit amount is the missing qty times unit price when billed in full", () => {
  assert.equal(creditAmountIls(3, 2, 33.333, BILLED_AS.FULL_ORDERED), 33.333);
  assert.equal(creditAmountIls(3, 2, 33.333, BILLED_AS.RECEIVED_ONLY), 0);
});

test("shortage is true when received is less than ordered", () => {
  assert.equal(isShortage(3, 2), true);
  assert.equal(isShortage(3, 3), false);
  assert.equal(qtyDiffers(3, 2), true);
});

test("order header lists company, branch, address, phone, contact, tax id first", () => {
  const lines = buildOrderHeaderLines({
    name: "סניף קרית יערים",
    address: "יצחק 27",
    phone: "0526408537",
    contactName: "רועי",
  });
  assert.equal(lines[0], `הזמנה מטעם ${COMPANY.nameHe} / ${COMPANY.name}`);
  assert.ok(lines[1].includes("קרית יערים"));
  assert.ok(lines[2].includes("יצחק 27"));
  assert.ok(lines[3].includes("0526408537"));
  assert.ok(lines[4].includes("רועי"));
  assert.ok(lines[5].includes("204754121"));
});

test("WhatsApp order text starts with company header then items", () => {
  const text = buildOrderWhatsAppText({
    createdAt: new Date("2026-09-16T10:00:00Z"),
    notesForDriver: null,
    branch: { name: "סניף קרית יערים", address: "יצחק 27", phone: "0526408537", contactName: "רועי" },
    supplier: { name: "כהן" },
    lines: [
      {
        qty: 2,
        unitPrice: 10,
        discountPercent: 0,
        product: { name: "עגבניות", sku: null, cartonToBags: null, bagsToUnits: null },
      },
    ],
  });
  const headerIndex = text.indexOf(`הזמנה מטעם ${COMPANY.nameHe}`);
  const itemsIndex = text.indexOf("פריטים:");
  const tomatoesIndex = text.indexOf("עגבניות");
  assert.ok(headerIndex === 0);
  assert.ok(itemsIndex > headerIndex);
  assert.ok(tomatoesIndex > itemsIndex);
  assert.ok(text.includes("יצחק 27"));
  assert.ok(text.includes("ח.פ. 204754121"));
});

test("WhatsApp URL is a real wa.me link with encoded text", () => {
  assert.equal(toWhatsAppPhone("0526408537"), "972526408537");
  const url = buildWhatsAppUrl("0526408537", "שלום");
  assert.ok(url.startsWith("https://wa.me/972526408537?text="));
  assert.ok(url.includes(encodeURIComponent("שלום")));
});

test("next order window warns a week later after missing today's cutoff", () => {
  const from = {
    day: 0,
    date: 16,
    month: 9,
    year: 2026,
    minutes: 15 * 60,
    dateLabel: "16/09/2026",
  };
  const info = nextOrderWindow([0], "14:00", 2, from);
  assert.equal(info.open, false);
  assert.equal(info.missedToday, true);
  assert.equal(info.daysUntil, 7);
  assert.equal(info.warning, "שים לב, ההזמנה הבאה לספק רק בעוד שבוע");
  assert.ok(info.label.includes("23/09/2026"));
});
