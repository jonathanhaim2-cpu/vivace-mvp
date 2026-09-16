"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireSession, requireBranchAccess } from "@/lib/access";

export async function setBranch(branchId: string) {
  const session = await requireSession();
  await requireBranchAccess(branchId, session);
  const jar = await cookies();
  jar.set("vivace-branch", branchId, { path: "/" });
  revalidatePath("/", "layout");
}
