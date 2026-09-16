import { EmptyState } from "@/components/page-header";

export default function ForbiddenPage() {
  return (
    <EmptyState
      title="אין הרשאה"
      description="התפקיד שלכם לא כולל את המסך הזה. אם זה טעות — פנו לאדמין בטבלת השליטה."
      action={{ href: "/", label: "חזרה לבית" }}
    />
  );
}
