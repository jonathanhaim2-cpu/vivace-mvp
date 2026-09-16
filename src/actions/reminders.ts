"use server";

import { revalidatePath } from "next/cache";
import { markRemindersNotified } from "@/lib/reminders";

export async function acknowledgeCutoffReminders(
  items: { supplierId: string; branchId: string; dateKey: string }[],
) {
  if (!Array.isArray(items) || items.length === 0) return;
  await markRemindersNotified(items.slice(0, 50));
  revalidatePath("/");
}
