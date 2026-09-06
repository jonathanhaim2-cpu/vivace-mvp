"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { Role } from "@/lib/constants";

export async function setRole(role: Role, branchId?: string) {
  const jar = await cookies();
  jar.set("vivace-role", role, { path: "/" });
  if (branchId) {
    jar.set("vivace-branch", branchId, { path: "/" });
  }
  revalidatePath("/", "layout");
}

export async function setBranch(branchId: string) {
  const jar = await cookies();
  jar.set("vivace-branch", branchId, { path: "/" });
  revalidatePath("/", "layout");
}
