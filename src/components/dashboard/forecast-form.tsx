import { saveDashboardSettings } from "@/actions/dashboard";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatIls } from "@/lib/format";

export function ForecastInputForm({
  forecast,
  compact = false,
}: {
  forecast: number;
  compact?: boolean;
}) {
  return (
    <form action={saveDashboardSettings} className={compact ? "grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end" : "space-y-3"}>
      <Field>
        <FieldLabel htmlFor="forecastTurnoverIls">מחזור מכירות חזוי לחודש (₪)</FieldLabel>
        <Input
          id="forecastTurnoverIls"
          name="forecastTurnoverIls"
          type="number"
          min={0}
          step="100"
          defaultValue={forecast}
          placeholder="למשל 180000"
        />
        {!compact ? (
          <FieldDescription>
            נשמר ב־dashboard.forecastTurnoverIls. הדשבורד מחשב מילוי קטגוריה מול היעד כאחוז מהמחזור
            {forecast > 0 ? ` (כעת ${formatIls(forecast)})` : ""}.
          </FieldDescription>
        ) : null}
      </Field>
      <Button type="submit">{compact ? "שמירת מחזור" : "שמירת מחזור חזוי"}</Button>
    </form>
  );
}
