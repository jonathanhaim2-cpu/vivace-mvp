import { saveDashboardSettings } from "@/actions/dashboard";
import { Button } from "@/components/ui/button";
import { CompactField, CompactForm } from "@/components/ui/compact-form";
import { Input } from "@/components/ui/input";
import { formatIls } from "@/lib/format";

export function ForecastInputForm({
  forecast,
}: {
  forecast: number;
  compact?: boolean;
}) {
  return (
    <CompactForm action={saveDashboardSettings}>
      <CompactField
        label="מחזור מכירות חזוי לחודש (₪)"
        htmlFor="forecastTurnoverIls"
        hint={`נשמר ב־dashboard.forecastTurnoverIls${forecast > 0 ? ` (כעת ${formatIls(forecast)})` : ""}.`}
        grow
      >
        <Input
          id="forecastTurnoverIls"
          name="forecastTurnoverIls"
          type="number"
          min={0}
          step="100"
          defaultValue={forecast}
          placeholder="למשל 180000"
        />
      </CompactField>
      <Button type="submit">שמירת מחזור</Button>
    </CompactForm>
  );
}
