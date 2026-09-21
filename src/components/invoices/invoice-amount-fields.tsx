"use client";

import { useState } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/compact-form";
import { PHOTO_DOCUMENT_TYPE, parsePhotoDocumentType, VAT_RATE } from "@/lib/constants";
import { splitVat } from "@/lib/money";
import { formatIls } from "@/lib/format";

export function InvoiceAmountFields({
  idPrefix,
  defaultAmount,
  defaultType,
  defaultVatIncluded = true,
}: {
  idPrefix: string;
  defaultAmount?: number | null;
  defaultType?: string | null;
  defaultVatIncluded?: boolean;
}) {
  const credit = parsePhotoDocumentType(defaultType) === PHOTO_DOCUMENT_TYPE.CREDIT_NOTE;
  const [vatIncluded, setVatIncluded] = useState(defaultVatIncluded);
  const [amount, setAmount] = useState(defaultAmount != null ? String(defaultAmount) : "");
  const numeric = Number(amount.replace(",", "."));
  const split = Number.isFinite(numeric) && numeric !== 0 ? splitVat(numeric, vatIncluded) : null;

  return (
    <>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}amountIls`}>
          {credit ? "סכום זיכוי (₪, אפשר מינוס)" : "סכום (₪)"}
        </FieldLabel>
        <Input
          id={`${idPrefix}amountIls`}
          name="amountIls"
          type="number"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder={credit ? "-180" : "2140"}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}vatIncluded`}>מע״מ</FieldLabel>
        <NativeSelect
          id={`${idPrefix}vatIncluded`}
          name="vatIncluded"
          value={vatIncluded ? "incl" : "ex"}
          onChange={(event) => setVatIncluded(event.target.value !== "ex")}
        >
          <option value="incl">כולל מע״מ</option>
          <option value="ex">לפני מע״מ</option>
        </NativeSelect>
      </Field>
      {split ? (
        <p className="sm:col-span-2 text-xs text-muted-foreground">
          לפני מע״מ {formatIls(split.amountExVat)} · מע״מ {formatIls(split.vatAmount)} ({Math.round(VAT_RATE * 100)}%) ·
          כולל {formatIls(split.amountInclVat)}
          {credit ? " · בדוח תשלום ייספר כמינוס" : ""}
        </p>
      ) : null}
    </>
  );
}
