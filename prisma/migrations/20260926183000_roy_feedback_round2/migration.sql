-- Roy feedback round 2. Additive only: new columns and tables. No deletes.
-- Boot re-runs this file on every Postgres start, so every statement must be a no-op
-- the second time. Apply on a database that already has the Vivace base schema.

-- Backfill isOrderable only when the column is created. A later boot must not turn
-- a supplier back on after someone set ספק הזמנות off.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Supplier'
      AND column_name = 'isOrderable'
  ) THEN
    ALTER TABLE "Supplier" ADD COLUMN "isOrderable" BOOLEAN NOT NULL DEFAULT false;
    UPDATE "Supplier" AS s
    SET "isOrderable" = true
    WHERE EXISTS (SELECT 1 FROM "Order" o WHERE o."supplierId" = s."id");
  END IF;
END $$;

ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "annualPurchaseTargetIls" DOUBLE PRECISION;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "paymentCardId" TEXT;

ALTER TABLE "Dish" ADD COLUMN IF NOT EXISTS "nodeKind" TEXT NOT NULL DEFAULT 'DISH';
ALTER TABLE "Dish" ADD COLUMN IF NOT EXISTS "parentId" TEXT;
ALTER TABLE "Dish" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Dish" ADD COLUMN IF NOT EXISTS "systemKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Dish_systemKey_key" ON "Dish"("systemKey");

DO $$ BEGIN
  ALTER TABLE "Dish" ADD CONSTRAINT "Dish_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Dish"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "RecurringLine" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;
ALTER TABLE "RecurringLine" ADD COLUMN IF NOT EXISTS "keywords" TEXT;
ALTER TABLE "RecurringLine" ADD COLUMN IF NOT EXISTS "expectedInvoicesPerMonth" INTEGER;

DO $$ BEGIN
  ALTER TABLE "RecurringLine" ADD CONSTRAINT "RecurringLine_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_paymentCardId_fkey"
    FOREIGN KEY ("paymentCardId") REFERENCES "PaymentCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SupplierRequest" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "supplierId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "orderId" TEXT,
  "goodsReceiptId" TEXT,
  "documentNumber" TEXT,
  "deliveryDate" TIMESTAMP(3),
  "previewBody" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3),
  "creditNotePhotoId" TEXT,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SupplierRequestLine" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "orderedQty" DOUBLE PRECISION NOT NULL,
  "receivedQty" DOUBLE PRECISION NOT NULL,
  "unitPrice" DOUBLE PRECISION,
  "amountDiff" DOUBLE PRECISION,
  "mark" TEXT NOT NULL,
  CONSTRAINT "SupplierRequestLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InvoiceExpenseLink" (
  "id" TEXT NOT NULL,
  "invoicePhotoId" TEXT NOT NULL,
  "recurringLineId" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'AUTO',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvoiceExpenseLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceExpenseLink_invoicePhotoId_key" ON "InvoiceExpenseLink"("invoicePhotoId");
CREATE INDEX IF NOT EXISTS "InvoiceExpenseLink_recurringLineId_idx" ON "InvoiceExpenseLink"("recurringLineId");
CREATE INDEX IF NOT EXISTS "SupplierRequest_status_kind_idx" ON "SupplierRequest"("status", "kind");
CREATE INDEX IF NOT EXISTS "SupplierRequest_supplierId_idx" ON "SupplierRequest"("supplierId");
CREATE INDEX IF NOT EXISTS "SupplierRequest_goodsReceiptId_idx" ON "SupplierRequest"("goodsReceiptId");

DO $$ BEGIN
  ALTER TABLE "SupplierRequest" ADD CONSTRAINT "SupplierRequest_supplierId_fkey"
    FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SupplierRequest" ADD CONSTRAINT "SupplierRequest_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SupplierRequest" ADD CONSTRAINT "SupplierRequest_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SupplierRequest" ADD CONSTRAINT "SupplierRequest_goodsReceiptId_fkey"
    FOREIGN KEY ("goodsReceiptId") REFERENCES "GoodsReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SupplierRequest" ADD CONSTRAINT "SupplierRequest_creditNotePhotoId_fkey"
    FOREIGN KEY ("creditNotePhotoId") REFERENCES "InvoicePhoto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SupplierRequestLine" ADD CONSTRAINT "SupplierRequestLine_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "SupplierRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "InvoiceExpenseLink" ADD CONSTRAINT "InvoiceExpenseLink_invoicePhotoId_fkey"
    FOREIGN KEY ("invoicePhotoId") REFERENCES "InvoicePhoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "InvoiceExpenseLink" ADD CONSTRAINT "InvoiceExpenseLink_recurringLineId_fkey"
    FOREIGN KEY ("recurringLineId") REFERENCES "RecurringLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
