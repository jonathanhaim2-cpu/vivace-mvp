import { redirect } from "next/navigation";

export default async function ReportsApRedirect({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  redirect(month ? `/ap?month=${month}` : "/ap");
}
