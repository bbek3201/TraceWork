export const PERMISSIONS = {
  projectRead: "project:read",
  projectManage: "project:manage",
  taskRead: "task:read",
  taskCreate: "task:create",
  taskSubmit: "task:submit",
  taskReview: "task:review",
  taskApprove: "task:approve",
  employeeManage: "employee:manage",
  attendanceManage: "attendance:manage",
  inventoryManage: "inventory:manage",
  reportsRead: "reports:read",
  settingsManage: "settings:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export type AppRole = "EMPLOYEE" | "TEAM_LEAD" | "MANAGER" | "HR" | "EXECUTIVE" | "ADMIN";

export const rolePermissions: Record<AppRole, Permission[]> = {
  EMPLOYEE: [PERMISSIONS.projectRead, PERMISSIONS.taskRead, PERMISSIONS.taskSubmit],
  TEAM_LEAD: [PERMISSIONS.projectRead, PERMISSIONS.taskRead, PERMISSIONS.taskCreate, PERMISSIONS.taskSubmit, PERMISSIONS.taskReview],
  MANAGER: [PERMISSIONS.projectRead, PERMISSIONS.projectManage, PERMISSIONS.taskRead, PERMISSIONS.taskCreate, PERMISSIONS.taskSubmit, PERMISSIONS.taskReview, PERMISSIONS.taskApprove, PERMISSIONS.reportsRead],
  HR: [PERMISSIONS.projectRead, PERMISSIONS.taskRead, PERMISSIONS.employeeManage, PERMISSIONS.attendanceManage, PERMISSIONS.reportsRead],
  EXECUTIVE: Object.values(PERMISSIONS).filter((permission) => permission !== PERMISSIONS.settingsManage),
  ADMIN: Object.values(PERMISSIONS),
};

export function can(role: AppRole, permission: Permission) {
  return rolePermissions[role].includes(permission);
}
