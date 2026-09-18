import assert from "node:assert/strict";
import test from "node:test";
import { WHATSAPP_STATUS } from "./constants";
import { whatsappStatusLabel, whatsappTickCount, whatsappTickTone } from "./whatsapp-status";

test("whatsapp ticks distinguish sent / received / read", () => {
  assert.equal(whatsappStatusLabel(WHATSAPP_STATUS.SENT), "נשלח");
  assert.equal(whatsappStatusLabel(WHATSAPP_STATUS.DELIVERED), "התקבלה");
  assert.equal(whatsappStatusLabel(WHATSAPP_STATUS.READ), "נקראה");
  assert.equal(whatsappTickCount(WHATSAPP_STATUS.SENT), 1);
  assert.equal(whatsappTickCount(WHATSAPP_STATUS.DELIVERED), 2);
  assert.equal(whatsappTickCount(WHATSAPP_STATUS.READ), 2);
  assert.equal(whatsappTickTone(WHATSAPP_STATUS.READ), "read");
  assert.equal(whatsappTickTone(WHATSAPP_STATUS.DELIVERED), "sent");
});
