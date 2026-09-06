import { EmptyState } from "@/components/page-header";

export default function NotFound() {
  return (
    <EmptyState
      title="העמוד לא נמצא"
      description="בדקו את הכתובת או חזרו לבית."
      action={{ href: "/", label: "חזרה לבית" }}
    />
  );
}
