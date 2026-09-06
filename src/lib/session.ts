import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/constants";

export async function getAppSession() {
  const jar = await cookies();
  const role: Role = jar.get("vivace-role")?.value === "network" ? "network" : "branch";
  const branches = await prisma.branch.findMany({ orderBy: { name: "asc" } });
  const requested = jar.get("vivace-branch")?.value;
  const branch = branches.find((b) => b.id === requested) ?? branches[0] ?? null;

  return {
    role,
    isNetwork: role === "network",
    branchId: branch?.id ?? null,
    branch,
    branches,
  };
}
