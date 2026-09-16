"use client";

import { resolveExceptionalItem } from "@/actions/exceptions";
import { EXCEPTION_KIND, EXCEPTION_STATUS } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export function ExceptionActions({
  id,
  kind,
}: {
  id: string;
  kind: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {kind === EXCEPTION_KIND.CREDIT_REQUEST ? (
        <form action={resolveExceptionalItem.bind(null, id, EXCEPTION_STATUS.CONFIRMED)}>
          <Button type="submit" size="sm">
            התקבל זיכוי מהספק
          </Button>
        </form>
      ) : null}
      {kind === EXCEPTION_KIND.ON_THE_WAY || kind === EXCEPTION_KIND.MISSING_NO_CREDIT ? (
        <form action={resolveExceptionalItem.bind(null, id, EXCEPTION_STATUS.ARRIVED)}>
          <Button type="submit" size="sm">
            הסחורה הגיעה
          </Button>
        </form>
      ) : null}
      <form action={resolveExceptionalItem.bind(null, id, EXCEPTION_STATUS.CANCELLED)}>
        <Button type="submit" size="sm" variant="outline">
          ביטול
        </Button>
      </form>
    </div>
  );
}
