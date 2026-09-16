import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/passwords";
import { APP_ROLES, DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, type AppRole } from "@/lib/roles";

const SEED_USERS: { username: string; name: string; env: "APP_PASSWORD" | "APP_PASSWORD_ROI"; role: AppRole }[] = [
  { username: "jonathan", name: "יונתן", env: "APP_PASSWORD", role: "admin" },
  { username: "roi", name: "רועי", env: "APP_PASSWORD_ROI", role: "admin" },
];

export async function seedAuthDefaults(prisma: PrismaClient) {
  for (const role of APP_ROLES) {
    for (const permission of PERMISSIONS) {
      await prisma.rolePermission.upsert({
        where: { role_key: { role, key: permission.key } },
        update: {},
        create: {
          role,
          key: permission.key,
          allowed: DEFAULT_ROLE_PERMISSIONS[role].includes(permission.key),
        },
      });
    }
  }

  for (const spec of SEED_USERS) {
    const password = process.env[spec.env]?.trim();
    if (!password) continue;
    const existing = await prisma.user.findUnique({ where: { username: spec.username } });
    if (existing) continue;
    await prisma.user.create({
      data: {
        name: spec.name,
        username: spec.username,
        passwordHash: await hashPassword(password),
        role: spec.role,
        active: true,
      },
    });
    console.log(`Seeded ${spec.role} user «${spec.username}» from ${spec.env} (password unchanged after first boot).`);
  }
}
