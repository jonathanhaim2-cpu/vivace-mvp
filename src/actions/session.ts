"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireSession, requireBranchAccess } from "@/lib/access";
import { NETWORK_BRANCH_VALUE } from "@/lib/invoice-branch";

export async function setBranch(branchId: string) {
  const session = await requireSession();
  const jar = await cookies();
  if (branchId === NETWORK_BRANCH_VALUE) {
    if (!session.isNetwork) throw new Error("אין הרשאה למשרד הרשת");
    jar.set("vivace-branch", NETWORK_BRANCH_VALUE, { path: "/" });
  } else {
    await requireBranchAccess(branchId, session);
    jar.set("vivace-branch", branchId, { path: "/" });
  }
  revalidatePath("/", "layout");
}
