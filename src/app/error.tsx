"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border bg-card px-6 py-10 text-center">
      <h1 className="font-heading text-xl font-semibold">משהו השתבש</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {error.message || "שגיאה לא צפויה. נסו שוב."}
      </p>
      <Button className="mt-4" onClick={reset}>
        ניסיון נוסף
      </Button>
    </div>
  );
}
