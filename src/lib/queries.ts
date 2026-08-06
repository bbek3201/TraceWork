import { prisma } from "@/lib/db";

export function listDepartments(organizationId: string) {
  return prisma.department.findMany({ where: { organizationId }, orderBy: { name: "asc" } });
}

export function listActiveMembers(organizationId: string) {
  return prisma.organizationMember.findMany({
    where: { organizationId, status: "ACTIVE" },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });
}

export function listProjectOptions(organizationId: string) {
  return prisma.project.findMany({
    where: { organizationId, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export function listProjectRows(organizationId: string) {
  return prisma.project.findMany({
    where: { organizationId, deletedAt: null },
    include: { department: true, _count: { select: { tasks: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export function listTaskRows(organizationId: string) {
  return prisma.task.findMany({
    where: { organizationId, deletedAt: null },
    include: { project: true, assignees: { include: { member: { include: { user: true } } } } },
    orderBy: { updatedAt: "desc" },
  });
}

export function listTaskTemplates(organizationId: string) {
  return prisma.taskTemplate.findMany({ where: { organizationId }, orderBy: { name: "asc" } });
}

export function getTaskTemplate(id: string, organizationId: string) {
  return prisma.taskTemplate.findFirst({ where: { id, organizationId } });
}

export function listTaskOptions(organizationId: string, excludeTaskId?: string) {
  return prisma.task.findMany({
    where: { organizationId, deletedAt: null, id: excludeTaskId ? { not: excludeTaskId } : undefined },
    select: { id: true, title: true, status: true },
    orderBy: { title: "asc" },
  });
}

export function getProjectDetail(id: string, organizationId: string) {
  return prisma.project.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: {
      department: true,
      tasks: { orderBy: { updatedAt: "desc" }, take: 20 },
    },
  });
}

export function getOrganization(organizationId: string) {
  return prisma.organization.findUnique({ where: { id: organizationId } });
}

export function listOrgMembersWithRoles(organizationId: string) {
  return prisma.organizationMember.findMany({
    where: { organizationId },
    include: { user: true, roles: { include: { role: true } } },
    orderBy: { user: { name: "asc" } },
  });
}

export function listEmployeeRows(organizationId: string) {
  return prisma.organizationMember.findMany({
    where: { organizationId },
    include: {
      user: true,
      department: true,
      assignments: { include: { task: { select: { status: true } } } },
    },
    orderBy: { user: { name: "asc" } },
  });
}

export function getMyProfile(memberId: string, organizationId: string) {
  return prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId },
    include: {
      user: true,
      department: true,
      branch: true,
      roles: { include: { role: true } },
    },
  });
}

export function getEmployeeDetail(id: string, organizationId: string) {
  return prisma.organizationMember.findFirst({
    where: { id, organizationId },
    include: {
      user: true,
      department: true,
      branch: true,
      roles: { include: { role: true } },
      assignments: {
        include: { task: { include: { project: true } } },
        orderBy: { task: { updatedAt: "desc" } },
        take: 20,
      },
      projectMemberships: { include: { project: true } },
    },
  });
}

export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function getTodayAttendance(memberId: string) {
  return prisma.attendance.findUnique({
    where: { memberId_workDate: { memberId, workDate: startOfToday() } },
  });
}

export function listTodayAttendanceRows(organizationId: string) {
  return prisma.attendance.findMany({
    where: { organizationId, workDate: startOfToday() },
    include: { member: { include: { user: true, department: true } } },
    orderBy: { member: { user: { name: "asc" } } },
  });
}

export function listLeaveRequests(organizationId: string) {
  return prisma.leaveRequest.findMany({
    where: { organizationId },
    include: { member: { include: { user: true } }, approvedBy: true },
    orderBy: { createdAt: "desc" },
  });
}

export function listProductRows(organizationId: string) {
  return prisma.product.findMany({
    where: { organizationId },
    include: { movements: { select: { type: true, quantity: true } } },
    orderBy: { name: "asc" },
  });
}

export function getProductDetail(id: string, organizationId: string) {
  return prisma.product.findFirst({
    where: { id, organizationId },
    include: {
      movements: { include: { createdBy: true }, orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
}

export function computeStockOnHand(movements: { type: string; quantity: number }[]) {
  return movements.reduce((sum, m) => (m.type === "ISSUE" ? sum - m.quantity : sum + m.quantity), 0);
}

export function listPurchaseOrders(organizationId: string) {
  return prisma.purchaseOrder.findMany({
    where: { organizationId },
    include: { items: true, receipts: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export function getPurchaseOrderDetail(id: string, organizationId: string) {
  return prisma.purchaseOrder.findFirst({
    where: { id, organizationId },
    include: {
      items: { include: { product: true, receiptItems: true } },
      createdBy: true,
      receipts: {
        orderBy: { createdAt: "desc" },
        include: { receivedBy: true, items: { include: { product: true } } },
      },
    },
  });
}

export function listOpenMismatches(organizationId: string) {
  return prisma.inventoryMismatch.findMany({
    where: { organizationId, status: "OPEN" },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });
}

export function listAllMismatches(organizationId: string) {
  return prisma.inventoryMismatch.findMany({
    where: { organizationId },
    include: { product: true, resolvedBy: true },
    orderBy: { createdAt: "desc" },
  });
}

export function listInventoryCounts(organizationId: string) {
  return prisma.inventoryCount.findMany({
    where: { organizationId },
    include: { createdBy: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

/** User ids of active members whose assigned role grants the given permission key (e.g. "task:review"). */
export async function listUserIdsWithPermission(organizationId: string, permissionKey: string) {
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      roles: { some: { role: { permissions: { some: { permission: { key: permissionKey } } } } } },
    },
    select: { userId: true },
  });
  return [...new Set(members.map((m) => m.userId))];
}

export function listRecentNotifications(organizationId: string, userId: string, limit = 15) {
  return prisma.notification.findMany({
    where: { organizationId, userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function countUnreadNotifications(organizationId: string, userId: string) {
  return prisma.notification.count({ where: { organizationId, userId, readAt: null } });
}

export function getTaskDetail(id: string, organizationId: string) {
  return prisma.task.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: {
      project: true,
      assignees: { include: { member: { include: { user: true } } } },
      requirements: {
        include: { evidence: { include: { uploadedBy: true }, orderBy: { version: "desc" } } },
      },
      checklist: true,
      createdBy: true,
      submissions: {
        orderBy: { version: "desc" },
        include: { reviews: { include: { reviewer: true }, orderBy: { createdAt: "desc" } } },
      },
      dependencies: { include: { dependsOn: { select: { id: true, title: true, status: true } } } },
      dependents: { include: { task: { select: { id: true, title: true, status: true } } } },
      handovers: {
        orderBy: { createdAt: "desc" },
        include: { fromMember: { include: { user: true } }, toMember: { include: { user: true } }, createdBy: true },
      },
      score: true,
    },
  });
}

export function listMemberTaskScores(memberId: string) {
  return prisma.taskScore.findMany({
    where: { task: { assignees: { some: { memberId } } } },
    select: { finalScore: true, deadlineCoefficient: true, qualityCoefficient: true },
  });
}

export async function listOrgMemberScoreTotals(organizationId: string) {
  const scores = await prisma.taskScore.findMany({
    where: { task: { organizationId } },
    select: { finalScore: true, task: { select: { assignees: { select: { memberId: true } } } } },
  });
  const totals = new Map<string, number>();
  for (const s of scores) {
    for (const a of s.task.assignees) {
      totals.set(a.memberId, (totals.get(a.memberId) ?? 0) + Number(s.finalScore));
    }
  }
  return totals;
}

export async function getTaskMetrics(organizationId: string) {
  const now = new Date();
  const [total, inProgress, awaitingReview, overdue] = await Promise.all([
    prisma.task.count({ where: { organizationId, deletedAt: null } }),
    prisma.task.count({ where: { organizationId, deletedAt: null, status: "IN_PROGRESS" } }),
    prisma.task.count({ where: { organizationId, deletedAt: null, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.task.count({ where: { organizationId, deletedAt: null, dueAt: { lt: now }, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
  ]);
  return { total, inProgress, awaitingReview, overdue };
}

export function getMyFocusTask(organizationId: string, memberId: string) {
  return prisma.task.findFirst({
    where: { organizationId, deletedAt: null, status: "IN_PROGRESS", assignees: { some: { memberId } } },
    include: { project: true, assignees: { include: { member: { include: { user: true } } } } },
    orderBy: [{ dueAt: "asc" }],
  });
}

export function listTopProjects(organizationId: string, limit = 3) {
  return prisma.project.findMany({
    where: { organizationId, deletedAt: null, status: { in: ["ACTIVE", "AT_RISK"] } },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

export function listReviewQueue(organizationId: string, limit = 5) {
  return prisma.task.findMany({
    where: { organizationId, deletedAt: null, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
    include: { project: true, assignees: { include: { member: { include: { user: true } } } } },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}

export async function listTeamWorkload(organizationId: string, limit = 5) {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId, status: "ACTIVE" },
    include: { user: true, assignments: { include: { task: { select: { status: true } } } } },
  });
  const active = new Set(["ASSIGNED", "IN_PROGRESS", "BLOCKED", "WAITING", "SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUIRED"]);
  return members
    .map((m) => ({ id: m.id, name: m.user.name, activeCount: m.assignments.filter((a) => active.has(a.task.status)).length }))
    .filter((m) => m.activeCount > 0)
    .sort((a, b) => b.activeCount - a.activeCount)
    .slice(0, limit);
}

export function countAtRiskTasks(organizationId: string) {
  const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  return prisma.task.count({
    where: { organizationId, deletedAt: null, status: { notIn: ["COMPLETED", "CANCELLED"] }, dueAt: { lt: soon } },
  });
}

export async function getOrgReportSummary(organizationId: string) {
  const [
    totalProjects,
    activeProjects,
    atRiskProjects,
    completedProjects,
    totalTasks,
    completedTasks,
    overdueTasks,
    scoredTasks,
    presentToday,
    lateToday,
    pendingLeave,
    approvedLeave,
    openMismatches,
    totalProducts,
  ] = await Promise.all([
    prisma.project.count({ where: { organizationId, deletedAt: null } }),
    prisma.project.count({ where: { organizationId, deletedAt: null, status: "ACTIVE" } }),
    prisma.project.count({ where: { organizationId, deletedAt: null, status: "AT_RISK" } }),
    prisma.project.count({ where: { organizationId, deletedAt: null, status: "COMPLETED" } }),
    prisma.task.count({ where: { organizationId, deletedAt: null } }),
    prisma.task.count({ where: { organizationId, deletedAt: null, status: "COMPLETED" } }),
    prisma.task.count({
      where: { organizationId, deletedAt: null, status: { notIn: ["COMPLETED", "CANCELLED"] }, dueAt: { lt: new Date() } },
    }),
    prisma.taskScore.findMany({ where: { task: { organizationId } }, select: { deadlineCoefficient: true } }),
    prisma.attendance.count({ where: { organizationId, workDate: startOfToday(), status: "PRESENT" } }),
    prisma.attendance.count({ where: { organizationId, workDate: startOfToday(), status: "LATE" } }),
    prisma.leaveRequest.count({ where: { organizationId, status: "PENDING" } }),
    prisma.leaveRequest.count({ where: { organizationId, status: "APPROVED" } }),
    prisma.inventoryMismatch.count({ where: { organizationId, status: "OPEN" } }),
    prisma.product.count({ where: { organizationId } }),
  ]);

  const onTimeRate =
    scoredTasks.length > 0
      ? Math.round((scoredTasks.filter((s) => Number(s.deadlineCoefficient) >= 1).length / scoredTasks.length) * 100)
      : 0;

  return {
    totalProjects,
    activeProjects,
    atRiskProjects,
    completedProjects,
    totalTasks,
    completedTasks,
    overdueTasks,
    taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    onTimeRate,
    presentToday,
    lateToday,
    pendingLeave,
    approvedLeave,
    openMismatches,
    totalProducts,
  };
}
