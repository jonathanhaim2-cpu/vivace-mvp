"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createBranch(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  if (!name) throw new Error("יש למלא שם סניף");

  const branch = await prisma.branch.create({ data: { name, address } });
  const jar = await cookies();
  if (!jar.get("vivace-branch")?.value) {
    jar.set("vivace-branch", branch.id, { path: "/" });
  }

  revalidatePath("/", "layout");
  revalidatePath("/settings");
  revalidatePath("/orders");
  revalidatePath("/inventory");
  revalidatePath("/waste");
}
