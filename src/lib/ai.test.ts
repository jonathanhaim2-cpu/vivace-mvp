import assert from "node:assert/strict";
import test from "node:test";
import { parseInvoiceAiSuggestion } from "./ai";
import { PHOTO_DOCUMENT_TYPE, photoDocumentTypeLabel } from "./constants";

test("parseInvoiceAiSuggestion maps CREDIT_NOTE and Hebrew credit aliases", () => {
  const credit = parseInvoiceAiSuggestion(
    '{"supplierName":"ירקות השרון","invoiceDate":"2026-09-01","totalIls":-180,"accountId":"acc_food_produce","documentType":"CREDIT_NOTE","confidence":0.91,"reason":"חשבונית זיכוי"}',
  );
  assert.equal(credit?.documentType, PHOTO_DOCUMENT_TYPE.CREDIT_NOTE);
  assert.equal(credit?.totalIls, -180);
  assert.equal(credit?.accountId, "acc_food_produce");
  assert.equal(credit?.branchHint, null);

  const hebrew = parseInvoiceAiSuggestion(
    '{"supplierName":"תנובה","invoiceDate":"2026-09-02","totalIls":90,"accountId":"acc_food_dairy","documentType":"חשבונית זיכוי","confidence":0.8,"reason":"זיכוי"}',
  );
  assert.equal(hebrew?.documentType, PHOTO_DOCUMENT_TYPE.CREDIT_NOTE);

  const alias = parseInvoiceAiSuggestion(
    '{"supplierName":"x","invoiceDate":"","totalIls":12,"accountId":"acc_food_misc","documentType":"credit invoice","confidence":0.7,"reason":"credit note"}',
  );
  assert.equal(alias?.documentType, PHOTO_DOCUMENT_TYPE.CREDIT_NOTE);
});

test("parseInvoiceAiSuggestion keeps INVOICE/RECEIPT/UNKNOWN mapping", () => {
  const invoice = parseInvoiceAiSuggestion(
    '{"supplierName":"x","invoiceDate":"2026-09-01","totalIls":10,"accountId":"acc_food_produce","documentType":"INVOICE","confidence":0.9,"reason":"חשבונית"}',
  );
  assert.equal(invoice?.documentType, PHOTO_DOCUMENT_TYPE.INVOICE);

  const receipt = parseInvoiceAiSuggestion(
    '{"supplierName":"x","invoiceDate":"2026-09-01","totalIls":10,"accountId":"acc_food_produce","documentType":"קבלה","confidence":0.9,"reason":"קבלה"}',
  );
  assert.equal(receipt?.documentType, PHOTO_DOCUMENT_TYPE.RECEIPT);

  const unknown = parseInvoiceAiSuggestion(
    '{"supplierName":"x","invoiceDate":"","totalIls":0,"accountId":"nope","documentType":"something-else","confidence":0.2,"reason":""}',
  );
  assert.equal(unknown?.documentType, PHOTO_DOCUMENT_TYPE.UNKNOWN);
  assert.equal(unknown?.accountId, null);
});

test("parseInvoiceAiSuggestion reads branchHint without forcing a guess", () => {
  const network = parseInvoiceAiSuggestion(
    '{"supplierName":"יועץ","invoiceDate":"2026-09-01","totalIls":1200,"accountId":"acc_admin_consulting","documentType":"INVOICE","branchHint":"network","confidence":0.88,"reason":"ייעוץ מטה"}',
  );
  assert.equal(network?.documentType, PHOTO_DOCUMENT_TYPE.INVOICE);
  assert.equal(network?.branchHint, "network");

  const city = parseInvoiceAiSuggestion(
    '{"supplierName":"ירקות","invoiceDate":"2026-09-01","totalIls":80,"accountId":"acc_food_produce","documentType":"INVOICE","branchName":"בית שמש","confidence":0.8,"reason":"כתובת אספקה"}',
  );
  assert.equal(city?.branchHint, "בית שמש");

  const unclear = parseInvoiceAiSuggestion(
    '{"supplierName":"x","invoiceDate":"","totalIls":10,"accountId":"acc_food_misc","documentType":"INVOICE","branchHint":"","confidence":0.4,"reason":"לא ברור"}',
  );
  assert.equal(unclear?.branchHint, null);
});

test("photoDocumentTypeLabel uses חשבונית זיכוי for CREDIT_NOTE", () => {
  assert.equal(photoDocumentTypeLabel("CREDIT_NOTE"), "חשבונית זיכוי");
  assert.equal(photoDocumentTypeLabel("INVOICE"), "חשבונית");
  assert.equal(photoDocumentTypeLabel("RECEIPT"), "קבלה");
  assert.equal(photoDocumentTypeLabel("UNKNOWN"), "לא ידוע");
});
