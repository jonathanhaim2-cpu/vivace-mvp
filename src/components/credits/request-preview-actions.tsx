"use client";

import { markSupplierRequestSent } from "@/actions/supplier-requests";
import { Button } from "@/components/ui/button";

export function RequestPreviewActions({
  requestId,
  body,
  mailto,
  sent,
}: {
  requestId: string;
  body: string;
  mailto: string;
  sent: boolean;
}) {
  function download() {
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `supplier-request-${requestId}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    await navigator.clipboard.writeText(body);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
        העתקה
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={download}>
        הורדה
      </Button>
      <a href={mailto}>
        <Button type="button" variant="outline" size="sm">
          פתיחת מייל
        </Button>
      </a>
      <form action={markSupplierRequestSent.bind(null, requestId)}>
        <Button type="submit" size="sm" disabled={sent}>
          {sent ? "סומן כנשלח" : "אישור שליחה"}
        </Button>
      </form>
    </div>
  );
}
