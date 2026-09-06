import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AccountRollupRow } from "@/lib/accounts";
import { formatIls } from "@/lib/format";

export function AccountRollup({ rows }: { rows: AccountRollupRow[] }) {
  const expenses = rows.filter((row) => row.kind === "EXPENSE");
  const income = rows.filter((row) => row.kind === "INCOME");

  return (
    <div className="space-y-6">
      <RollupSection title="הוצאות" description="כרטיסי בן + סיכום לקטגוריית האב, לפי סדר כרטיסי הנה״ח" rows={expenses} />
      <RollupSection
        title='הכנסות ללא מע"מ'
        description="מדידה לכל כרטיס ולסיכום האב"
        rows={income}
      />
    </div>
  );
}

function RollupSection({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: AccountRollupRow[];
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {rows.map((parent) => (
        <Card key={parent.id}>
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{parent.name}</CardTitle>
                <CardDescription>סיכום {parent.children.length} כרטיסים</CardDescription>
              </div>
              <div className="text-end text-sm">
                <p className="font-medium">{formatIls(parent.amount)}</p>
                <p className="text-muted-foreground">{parent.documents} מסמכים</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {parent.children.map((child) => (
              <div key={child.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span>{child.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {formatIls(child.amount)} · {child.documents}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
