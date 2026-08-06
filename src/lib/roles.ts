import { prisma } from "@/lib/db";
import { PERMISSIONS, rolePermissions, type AppRole } from "@/lib/permissions";

export const ALL_APP_ROLES: AppRole[] = ["EMPLOYEE", "TEAM_LEAD", "MANAGER", "HR", "EXECUTIVE", "ADMIN"];

/**
 * Idempotently creates all app roles (with their permission grants) for an organization.
 *
 * Batches every upsert into a handful of concurrent round-trips instead of looping
 * awaits sequentially (6 roles x up to 12 permissions each) — on a pooled/remote
 * connection (e.g. Neon) that serial version took 50+ seconds; this version is a few.
 */
export async function ensureOrgRoles(organizationId: string) {
  const [permissions, roleEntries] = await Promise.all([
    Promise.all(Object.values(PERMISSIONS).map((key) => prisma.permission.upsert({ where: { key }, update: {}, create: { key } }))),
    Promise.all(
      ALL_APP_ROLES.map((roleName) =>
        prisma.role
          .upsert({
            where: { organizationId_name: { organizationId, name: roleName } },
            update: {},
            create: { organizationId, name: roleName },
          })
          .then((role) => [roleName, role] as const),
      ),
    ),
  ]);

  const permissionByKey = new Map(permissions.map((p) => [p.key, p]));
  const roles = new Map<AppRole, { id: string; name: string }>(roleEntries);

  const rolePermissionData = ALL_APP_ROLES.flatMap((roleName) => {
    const role = roles.get(roleName);
    if (!role) return [];
    return rolePermissions[roleName]
      .map((permKey) => permissionByKey.get(permKey))
      .filter((permission): permission is NonNullable<typeof permission> => Boolean(permission))
      .map((permission) => ({ roleId: role.id, permissionId: permission.id }));
  });

  if (rolePermissionData.length > 0) {
    await prisma.rolePermission.createMany({ data: rolePermissionData, skipDuplicates: true });
  }

  return roles;
}
