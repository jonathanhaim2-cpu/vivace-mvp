import { COMPANY } from "@/lib/constants";
import type { AccountRollupRow } from "@/lib/accounts";
import { formatIls } from "@/lib/format";
import { monthLabel } from "@/lib/months";

export function accountantPackageText(month: string, rows: AccountRollupRow[]) {
  const expenses = rows.filter((row) => row.kind === "EXPENSE");
  const income = rows.filter((row) => row.kind === "INCOME");
  const expenseTotal = expenses.reduce((sum, row) => sum + row.amount, 0);
  const incomeTotal = income.reduce((sum, row) => sum + row.amount, 0);

  const lines: string[] = [
    `${COMPANY.name} / ${COMPANY.nameHe}`,
    `עוסק מורשה ${COMPANY.taxId}`,
    `חבילת הנה״ח לחודש ${monthLabel(month)}`,
    "",
    "סיכום הוצאות לפי קטגוריית אב:",
  ];

  for (const parent of expenses) {
    lines.push(`• ${parent.name}: ${formatIls(parent.amount)} (${parent.documents} מסמכים)`);
    for (const child of parent.children.filter((item) => item.documents > 0 || item.amount > 0)) {
      lines.push(`   - ${child.name}: ${formatIls(child.amount)} (${child.documents})`);
    }
  }

  lines.push("", `סה״כ הוצאות: ${formatIls(expenseTotal)}`, "", 'הכנסות ללא מע"מ:');
  for (const parent of income) {
    lines.push(`• ${parent.name}: ${formatIls(parent.amount)}`);
    for (const child of parent.children.filter((item) => item.documents > 0 || item.amount > 0)) {
      lines.push(`   - ${child.name}: ${formatIls(child.amount)} (${child.documents})`);
    }
  }
  lines.push("", `סה״כ הכנסות מדווחות: ${formatIls(incomeTotal)}`);
  lines.push("", "הקבצים מצורפים ב-ZIP לפי כרטיס.");

  return {
    subject: `${COMPANY.nameHe} · חבילת הנה״ח ${monthLabel(month)} · ${COMPANY.taxId}`,
    body: lines.join("\n"),
    expenseTotal,
    incomeTotal,
  };
}

export function accountantMailto(month: string, rows: AccountRollupRow[]) {
  const { subject, body } = accountantPackageText(month, rows);
  return `mailto:${COMPANY.accountantEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
