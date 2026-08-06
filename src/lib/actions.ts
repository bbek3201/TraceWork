"use server";

import type { EvidenceType, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { hashPassword, verifyPassword } from "@/lib/password";
import { PERMISSIONS, can, type AppRole } from "@/lib/permissions";
import { computeStockOnHand, listUserIdsWithPermission, startOfToday } from "@/lib/queries";
import { ALL_APP_ROLES, ensureOrgRoles } from "@/lib/roles";
import { saveUploadedFile } from "@/lib/storage";
import { assertTaskTransition, canSubmitEvidence, requiredApprovalSteps, type TaskState } from "@/lib/task-machine";

const MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Нэвтрээгүй байна.");
  return session;
}

const projectSchema = z.object({
  name: z.string().trim().min(2, "Төслийн нэрийг оруулна уу.").max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  departmentId: z.string().trim().optional().or(z.literal("")),
  startDate: z.string().trim().optional().or(z.literal("")),
  dueDate: z.string().trim().optional().or(z.literal("")),
});

export async function createProject(formData: FormData) {
  const session = await requireSession();
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    departmentId: formData.get("departmentId"),
    startDate: formData.get("startDate"),
    dueDate: formData.get("dueDate"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Төслийн мэдээллийг шалгана уу.");
  const { name, description, departmentId, startDate, dueDate } = parsed.data;

  if (departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: departmentId, organizationId: session.user.organizationId },
    });
    if (!department) throw new Error("Хэлтэс олдсонгүй.");
  }

  const project = await prisma.project.create({
    data: {
      organizationId: session.user.organizationId,
      name,
      description: description || undefined,
      departmentId: departmentId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    },
  });
  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "project.create",
    entityType: "Project",
    entityId: project.id,
    newValue: { name: project.name },
  });

  revalidatePath("/projects");
  redirect("/projects");
}

const taskSchema = z.object({
  title: z.string().trim().min(2, "Ажлын нэрийг оруулна уу.").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  projectId: z.string().trim().min(1, "Төсөл сонгоно уу."),
  assigneeMemberId: z.string().trim().optional().or(z.literal("")),
  priority: z.coerce.number().int().min(1).max(4).default(2),
  difficulty: z.coerce.number().int().min(1).max(5).default(1),
  basePoints: z.coerce.number().min(0).max(1000).default(0),
  dueAt: z.string().trim().optional().or(z.literal("")),
  dependsOnTaskId: z.string().trim().optional().or(z.literal("")),
  dependencyType: z.enum(["FINISH_TO_START", "START_TO_START", "FINISH_TO_FINISH"]).default("FINISH_TO_START"),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("LOW"),
  templateId: z.string().trim().optional().or(z.literal("")),
});

export async function createTask(formData: FormData) {
  const session = await requireSession();
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    projectId: formData.get("projectId"),
    assigneeMemberId: formData.get("assigneeMemberId"),
    priority: formData.get("priority"),
    difficulty: formData.get("difficulty"),
    basePoints: formData.get("basePoints"),
    dueAt: formData.get("dueAt"),
    dependsOnTaskId: formData.get("dependsOnTaskId"),
    dependencyType: formData.get("dependencyType") || "FINISH_TO_START",
    riskLevel: formData.get("riskLevel") || "LOW",
    templateId: formData.get("templateId"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Ажлын мэдээллийг шалгана уу.");
  const { title, description, projectId, assigneeMemberId, priority, difficulty, basePoints, dueAt, dependsOnTaskId, dependencyType, riskLevel, templateId } = parsed.data;

  let template: { checklistItems: unknown; requirementItems: unknown } | null = null;
  if (templateId) {
    template = await prisma.taskTemplate.findFirst({
      where: { id: templateId, organizationId: session.user.organizationId },
      select: { checklistItems: true, requirementItems: true },
    });
    if (!template) throw new Error("Сонгосон загвар олдсонгүй.");
  }

  let dependsOnTask: { id: string } | null = null;
  if (dependsOnTaskId) {
    dependsOnTask = await prisma.task.findFirst({
      where: { id: dependsOnTaskId, organizationId: session.user.organizationId },
      select: { id: true },
    });
    if (!dependsOnTask) throw new Error("Сонгосон өмнөх ажил олдсонгүй.");
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: session.user.organizationId },
  });
  if (!project) throw new Error("Төсөл олдсонгүй.");

  let assigneeUserId: string | null = null;
  if (assigneeMemberId) {
    const member = await prisma.organizationMember.findFirst({
      where: { id: assigneeMemberId, organizationId: session.user.organizationId },
    });
    if (!member) throw new Error("Хариуцагч олдсонгүй.");
    assigneeUserId = member.userId;
  }

  const task = await prisma.task.create({
    data: {
      organizationId: session.user.organizationId,
      projectId,
      title,
      description: description || undefined,
      status: assigneeMemberId ? "ASSIGNED" : "DRAFT",
      riskLevel,
      priority,
      difficulty,
      basePoints,
      dueAt: dueAt ? new Date(dueAt) : undefined,
      createdById: session.user.id,
      assignees: assigneeMemberId ? { create: { memberId: assigneeMemberId } } : undefined,
    },
  });
  if (dependsOnTask) {
    await prisma.taskDependency.create({
      data: { taskId: task.id, dependsOnTaskId: dependsOnTask.id, dependencyType },
    });
  }
  if (template) {
    const checklistItems = Array.isArray(template.checklistItems) ? (template.checklistItems as string[]) : [];
    if (checklistItems.length > 0) {
      await prisma.taskChecklist.createMany({
        data: checklistItems.map((title) => ({ taskId: task.id, title })),
      });
    }
    const requirementItems = Array.isArray(template.requirementItems)
      ? (template.requirementItems as { type: string; title: string }[])
      : [];
    if (requirementItems.length > 0) {
      await prisma.evidenceRequirement.createMany({
        data: requirementItems.map((r) => ({ taskId: task.id, type: r.type as EvidenceType, title: r.title })),
      });
    }
  }
  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "task.create",
    entityType: "Task",
    entityId: task.id,
    newValue: { title: task.title, assigneeMemberId: assigneeMemberId || null, dependsOnTaskId: dependsOnTaskId || null, templateId: templateId || null },
  });
  if (assigneeUserId) {
    await notify(prisma, {
      organizationId: session.user.organizationId,
      userIds: [assigneeUserId],
      type: "task_assigned",
      title: "Шинэ ажил оноогдлоо",
      body: task.title,
      entityType: "Task",
      entityId: task.id,
    });
  }

  revalidatePath("/tasks");
  redirect("/tasks");
}

const assignRoleSchema = z.object({
  memberId: z.string().trim().min(1),
  role: z.enum(ALL_APP_ROLES as [string, ...string[]]),
});

export async function assignRole(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role as AppRole, PERMISSIONS.settingsManage)) throw new Error("Эрх оноох эрхгүй байна.");

  const parsed = assignRoleSchema.safeParse({ memberId: formData.get("memberId"), role: formData.get("role") });
  if (!parsed.success) throw new Error("Мэдээллийг шалгана уу.");
  const { memberId, role } = parsed.data;

  const member = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: session.user.organizationId },
  });
  if (!member) throw new Error("Ажилтан олдсонгүй.");

  const roles = await ensureOrgRoles(session.user.organizationId);
  const targetRole = roles.get(role as AppRole);
  if (!targetRole) throw new Error("Эрх олдсонгүй.");

  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { memberId } }),
    prisma.userRole.create({ data: { memberId, roleId: targetRole.id } }),
  ]);
  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "member.role_assign",
    entityType: "OrganizationMember",
    entityId: memberId,
    newValue: { role },
  });

  revalidatePath(`/employees/${memberId}`);
}

async function loadOrgTask(taskId: string, organizationId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId },
    include: {
      assignees: { include: { member: { select: { userId: true } } } },
      submissions: { orderBy: { version: "desc" }, take: 1, include: { reviews: true } },
      requirements: { select: { id: true, required: true, evidence: { select: { id: true } } } },
      dependencies: { include: { dependsOn: { select: { id: true, title: true, status: true } } } },
    },
  });
  if (!task) throw new Error("Ажил олдсонгүй.");
  return task;
}

const startedTaskStatuses = new Set(["IN_PROGRESS", "BLOCKED", "WAITING", "SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUIRED", "APPROVED", "REJECTED", "COMPLETED"]);

function assertDependenciesSatisfied(task: { dependencies: { dependencyType: string; dependsOn: { title: string; status: string } }[] }) {
  for (const dep of task.dependencies) {
    if (dep.dependencyType === "FINISH_TO_START" && dep.dependsOn.status !== "COMPLETED") {
      throw new Error(`"${dep.dependsOn.title}" ажил дуусаагүй байна. Өмнөх ажил дуусмагц эхлүүлнэ үү.`);
    }
    if (dep.dependencyType === "START_TO_START" && !startedTaskStatuses.has(dep.dependsOn.status)) {
      throw new Error(`"${dep.dependsOn.title}" ажил хараахан эхлээгүй байна.`);
    }
  }
}

export async function startTask(formData: FormData) {
  const session = await requireSession();
  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) throw new Error("Ажил тодорхойгүй байна.");

  const task = await loadOrgTask(taskId, session.user.organizationId);
  const isAssignee = task.assignees.some((a) => a.memberId === session.user.memberId);
  if (!isAssignee) throw new Error("Зөвхөн хариуцагч энэ үйлдлийг хийж чадна.");

  assertTaskTransition(task.status as TaskState, "IN_PROGRESS");
  assertDependenciesSatisfied(task);
  await prisma.task.update({ where: { id: taskId }, data: { status: "IN_PROGRESS", blockedReason: null, blockedNote: null } });
  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "task.start",
    entityType: "Task",
    entityId: taskId,
    previousValue: { status: task.status },
    newValue: { status: "IN_PROGRESS" },
  });
  revalidatePath(`/tasks/${taskId}`);
}

const blockTaskSchema = z.object({
  taskId: z.string().trim().min(1),
  targetStatus: z.enum(["BLOCKED", "WAITING"]),
  reason: z.enum([
    "MISSING_DOCUMENT",
    "WAITING_APPROVAL",
    "WAITING_SUPPLIER",
    "WAITING_CUSTOMER",
    "WAITING_PAYMENT",
    "MISSING_MATERIAL",
    "TECHNICAL_ISSUE",
    "SYSTEM_ISSUE",
    "PREVIOUS_TASK_INCOMPLETE",
    "OTHER",
  ]),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function markTaskBlocked(formData: FormData) {
  const session = await requireSession();
  const parsed = blockTaskSchema.safeParse({
    taskId: formData.get("taskId"),
    targetStatus: formData.get("targetStatus"),
    reason: formData.get("reason"),
    note: formData.get("note"),
  });
  if (!parsed.success) throw new Error("Мэдээллийг шалгана уу.");
  const { taskId, targetStatus, reason, note } = parsed.data;

  const task = await loadOrgTask(taskId, session.user.organizationId);
  const isAssignee = task.assignees.some((a) => a.memberId === session.user.memberId);
  if (!isAssignee) throw new Error("Зөвхөн хариуцагч энэ үйлдлийг хийж чадна.");

  assertTaskTransition(task.status as TaskState, targetStatus);
  await prisma.task.update({
    where: { id: taskId },
    data: { status: targetStatus, blockedReason: reason, blockedNote: note || undefined },
  });
  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "task.block",
    entityType: "Task",
    entityId: taskId,
    previousValue: { status: task.status },
    newValue: { status: targetStatus, reason },
  });
  if (task.createdById !== session.user.id) {
    await notify(prisma, {
      organizationId: session.user.organizationId,
      userIds: [task.createdById],
      type: "task_blocked",
      title: targetStatus === "BLOCKED" ? "Ажил хориглогдлоо" : "Ажил хүлээгдэж байна",
      body: note || undefined,
      entityType: "Task",
      entityId: taskId,
    });
  }
  revalidatePath(`/tasks/${taskId}`);
}

export async function submitTaskForReview(formData: FormData) {
  const session = await requireSession();
  const taskId = String(formData.get("taskId") ?? "").trim();
  if (!taskId) throw new Error("Ажил тодорхойгүй байна.");

  const task = await loadOrgTask(taskId, session.user.organizationId);
  const isAssignee = task.assignees.some((a) => a.memberId === session.user.memberId);
  if (!isAssignee) throw new Error("Зөвхөн хариуцагч энэ үйлдлийг хийж чадна.");

  assertTaskTransition(task.status as TaskState, "SUBMITTED");

  const requiredIds = task.requirements.filter((r) => r.required).map((r) => r.id);
  const fulfilledIds = task.requirements.filter((r) => r.evidence.length > 0).map((r) => r.id);
  if (!canSubmitEvidence(requiredIds, fulfilledIds)) {
    throw new Error("Шаардлагатай бүх нотолгоог хавсаргасны дараа илгээнэ үү.");
  }

  const nextVersion = (task.submissions[0]?.version ?? 0) + 1;
  await prisma.$transaction([
    prisma.taskSubmission.create({ data: { taskId, version: nextVersion } }),
    prisma.task.update({ where: { id: taskId }, data: { status: "SUBMITTED" } }),
  ]);
  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "task.submit",
    entityType: "Task",
    entityId: taskId,
    newValue: { version: nextVersion },
  });
  const reviewerIds = (await listUserIdsWithPermission(session.user.organizationId, PERMISSIONS.taskReview)).filter(
    (userId) => userId !== session.user.id,
  );
  await notify(prisma, {
    organizationId: session.user.organizationId,
    userIds: reviewerIds,
    type: "task_submitted",
    title: "Шалгах ажил ирлээ",
    entityType: "Task",
    entityId: taskId,
  });
  revalidatePath(`/tasks/${taskId}`);
}

const reviewDecisionTarget: Record<string, TaskState> = {
  APPROVED: "COMPLETED",
  CHANGES_REQUIRED: "CHANGES_REQUIRED",
  REJECTED: "REJECTED",
};

export async function reviewTask(formData: FormData) {
  const session = await requireSession();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const qualityScoreRaw = String(formData.get("qualityScore") ?? "").trim();
  const qualityScore = qualityScoreRaw ? Number(qualityScoreRaw) : null;
  if (!taskId) throw new Error("Ажил тодорхойгүй байна.");
  if (!(decision in reviewDecisionTarget)) throw new Error("Шийдвэр буруу байна.");
  if (decision !== "APPROVED" && !reason) throw new Error("Шалтгаанаа бичнэ үү.");
  if (qualityScore !== null) {
    if (!Number.isInteger(qualityScore) || qualityScore < 1 || qualityScore > 5) {
      throw new Error("Чанарын үнэлгээ 1-5 хооронд байна.");
    }
    if (qualityScore < 3 && !reason) throw new Error("Бага үнэлгээ өгөхдөө шалтгаанаа бичнэ үү.");
  }

  const task = await loadOrgTask(taskId, session.user.organizationId);
  if (task.status === "SUBMITTED") {
    assertTaskTransition(task.status as TaskState, "UNDER_REVIEW");
  } else if (task.status !== "UNDER_REVIEW") {
    throw new Error("Энэ ажил шалгах шатанд алга байна.");
  }

  const submission = task.submissions[0];
  if (!submission) throw new Error("Илгээсэн хувилбар олдсонгүй.");

  const approvedReviews = submission.reviews.filter((r) => r.decision === "APPROVED");
  const requiredSteps = requiredApprovalSteps(task.riskLevel);
  const isFinalStep = approvedReviews.length + 1 >= requiredSteps;

  let targetStatus: TaskState;
  if (decision === "APPROVED") {
    if (approvedReviews.some((r) => r.reviewerId === session.user.id)) {
      throw new Error("Та энэ ажлыг аль хэдийн зөвшөөрсөн байна.");
    }
    const requiredPermission = isFinalStep ? PERMISSIONS.taskApprove : PERMISSIONS.taskReview;
    if (!can(session.user.role as AppRole, requiredPermission)) {
      throw new Error(isFinalStep ? "Эцсийн баталгаажуулалт хийх эрхгүй байна." : "Шалгах эрхгүй байна.");
    }
    targetStatus = isFinalStep ? "COMPLETED" : "UNDER_REVIEW";
  } else {
    if (!can(session.user.role as AppRole, PERMISSIONS.taskReview)) throw new Error("Шалгах эрхгүй байна.");
    targetStatus = reviewDecisionTarget[decision];
  }
  if (targetStatus !== "UNDER_REVIEW") {
    assertTaskTransition("UNDER_REVIEW", targetStatus);
  }

  const writes: Prisma.PrismaPromise<unknown>[] = [
    prisma.taskReview.create({
      data: {
        submissionId: submission.id,
        reviewerId: session.user.id,
        decision: decision as "APPROVED" | "CHANGES_REQUIRED" | "REJECTED",
        reason: reason || undefined,
        qualityScore: qualityScore ?? undefined,
      },
    }),
    prisma.task.update({
      where: { id: taskId },
      data: { status: targetStatus, progress: targetStatus === "COMPLETED" ? 100 : undefined },
    }),
  ];

  if (targetStatus === "COMPLETED") {
    const qualityScores = [...approvedReviews.map((r) => r.qualityScore), qualityScore].filter(
      (v): v is number => v !== null && v !== undefined,
    );
    const avgQuality = qualityScores.length > 0 ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length : 5;
    const qualityCoefficient = avgQuality / 5;
    const onTime = !task.dueAt || new Date() <= task.dueAt;
    const deadlineCoefficient = onTime ? 1 : 0.8;
    const totalRequirements = task.requirements.length;
    const fulfilledRequirements = task.requirements.filter((r) => r.evidence.length > 0).length;
    const evidenceCoefficient = totalRequirements > 0 ? fulfilledRequirements / totalRequirements : 1;
    const basePoint = Number(task.basePoints);
    const finalScore = basePoint * deadlineCoefficient * qualityCoefficient * evidenceCoefficient;

    writes.push(
      prisma.taskScore.upsert({
        where: { taskId },
        update: { basePoint, deadlineCoefficient, qualityCoefficient, evidenceCoefficient, finalScore },
        create: { taskId, basePoint, deadlineCoefficient, qualityCoefficient, evidenceCoefficient, finalScore },
      }),
    );
  }

  await prisma.$transaction(writes);
  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "task.review",
    entityType: "Task",
    entityId: taskId,
    newValue: { decision, status: targetStatus, reason: reason || null, step: approvedReviews.length + 1, requiredSteps },
  });

  if (decision === "APPROVED" && !isFinalStep) {
    const nextApproverIds = (await listUserIdsWithPermission(session.user.organizationId, PERMISSIONS.taskApprove)).filter(
      (userId) => userId !== session.user.id,
    );
    await notify(prisma, {
      organizationId: session.user.organizationId,
      userIds: nextApproverIds,
      type: "task_reviewed",
      title: `Ажил ${approvedReviews.length + 1}/${requiredSteps} шатны баталгаажуулалт авлаа`,
      body: task.title,
      entityType: "Task",
      entityId: taskId,
    });
  } else {
    const decisionTitle: Record<string, string> = {
      APPROVED: "Ажил эцэслэн батлагдлаа",
      CHANGES_REQUIRED: "Ажилд засвар шаардлагатай",
      REJECTED: "Ажил татгалзагдлаа",
    };
    await notify(prisma, {
      organizationId: session.user.organizationId,
      userIds: task.assignees.map((a) => a.member.userId),
      type: "task_reviewed",
      title: decisionTitle[decision] ?? "Ажил шалгагдлаа",
      body: reason || undefined,
      entityType: "Task",
      entityId: taskId,
    });
  }
  revalidatePath(`/tasks/${taskId}`);
}

const reassignSchema = z.object({
  taskId: z.string().trim().min(1),
  toMemberId: z.string().trim().min(1, "Орлох ажилтныг сонгоно уу."),
  transferType: z.enum(["TEMPORARY", "PERMANENT"]),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function reassignTask(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role as AppRole, PERMISSIONS.projectManage)) throw new Error("Ажил шилжүүлэх эрхгүй байна.");

  const parsed = reassignSchema.safeParse({
    taskId: formData.get("taskId"),
    toMemberId: formData.get("toMemberId"),
    transferType: formData.get("transferType"),
    note: formData.get("note"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Мэдээллийг шалгана уу.");
  const { taskId, toMemberId, transferType, note } = parsed.data;

  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: session.user.organizationId },
    include: { assignees: { include: { member: { select: { userId: true } } } } },
  });
  if (!task) throw new Error("Ажил олдсонгүй.");

  const currentAssignee = task.assignees[0];
  if (!currentAssignee) throw new Error("Энэ ажилд одоогоор хариуцагч байхгүй тул шилжүүлэх боломжгүй.");
  if (currentAssignee.memberId === toMemberId) throw new Error("Энэ ажилтан аль хэдийн хариуцаж байна.");

  const toMember = await prisma.organizationMember.findFirst({
    where: { id: toMemberId, organizationId: session.user.organizationId, status: "ACTIVE" },
  });
  if (!toMember) throw new Error("Орлох ажилтан олдсонгүй.");

  await prisma.$transaction(async (tx) => {
    if (transferType === "PERMANENT") {
      await tx.taskAssignee.deleteMany({ where: { taskId } });
      await tx.taskAssignee.create({ data: { taskId, memberId: toMemberId } });
    } else {
      const existing = await tx.taskAssignee.findUnique({
        where: { taskId_memberId: { taskId, memberId: toMemberId } },
      });
      if (!existing) await tx.taskAssignee.create({ data: { taskId, memberId: toMemberId } });
    }
    await tx.taskHandover.create({
      data: {
        taskId,
        fromMemberId: currentAssignee.memberId,
        toMemberId,
        transferType,
        note: note || undefined,
        createdById: session.user.id,
      },
    });
  });

  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "task.reassign",
    entityType: "Task",
    entityId: taskId,
    previousValue: { fromMemberId: currentAssignee.memberId },
    newValue: { toMemberId, transferType },
  });
  await notify(prisma, {
    organizationId: session.user.organizationId,
    userIds: [toMember.userId],
    type: "task_assigned",
    title: "Танд ажил шилжлээ",
    body: task.title,
    entityType: "Task",
    entityId: taskId,
  });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath(`/employees/${currentAssignee.memberId}`);
  revalidatePath(`/employees/${toMemberId}`);
}

export async function checkIn() {
  const session = await requireSession();
  const workDate = startOfToday();
  const existing = await prisma.attendance.findUnique({
    where: { memberId_workDate: { memberId: session.user.memberId, workDate } },
  });
  if (existing?.checkInAt) throw new Error("Та өнөөдөр аль хэдийн ирц бүртгүүлсэн байна.");

  const attendance = await prisma.attendance.upsert({
    where: { memberId_workDate: { memberId: session.user.memberId, workDate } },
    update: { checkInAt: new Date(), status: "PRESENT" },
    create: {
      organizationId: session.user.organizationId,
      memberId: session.user.memberId,
      workDate,
      checkInAt: new Date(),
      status: "PRESENT",
    },
  });
  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "attendance.check_in",
    entityType: "Attendance",
    entityId: attendance.id,
  });
  revalidatePath("/attendance");
}

export async function checkOut() {
  const session = await requireSession();
  const workDate = startOfToday();
  const existing = await prisma.attendance.findUnique({
    where: { memberId_workDate: { memberId: session.user.memberId, workDate } },
  });
  if (!existing?.checkInAt) throw new Error("Эхлээд ирц бүртгүүлнэ үү.");
  if (existing.checkOutAt) throw new Error("Та өнөөдөр аль хэдийн явсан бүртгэлтэй байна.");

  await prisma.attendance.update({ where: { id: existing.id }, data: { checkOutAt: new Date() } });
  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "attendance.check_out",
    entityType: "Attendance",
    entityId: existing.id,
  });
  revalidatePath("/attendance");
}

const leaveSchema = z.object({
  leaveType: z.enum(["ANNUAL", "SICK", "UNPAID", "OTHER"]),
  startDate: z.string().trim().min(1, "Эхлэх огноог сонгоно уу."),
  endDate: z.string().trim().min(1, "Дуусах огноог сонгоно уу."),
  reason: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function requestLeave(formData: FormData) {
  const session = await requireSession();
  const parsed = leaveSchema.safeParse({
    leaveType: formData.get("leaveType"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Хүсэлтийн мэдээллийг шалгана уу.");
  const { leaveType, startDate, endDate, reason } = parsed.data;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) throw new Error("Дуусах огноо эхлэх огнооноос өмнө байж болохгүй.");

  const leave = await prisma.leaveRequest.create({
    data: {
      organizationId: session.user.organizationId,
      memberId: session.user.memberId,
      leaveType,
      startDate: start,
      endDate: end,
      reason: reason || undefined,
    },
  });
  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "leave.request",
    entityType: "LeaveRequest",
    entityId: leave.id,
    newValue: { leaveType, startDate: start.toISOString(), endDate: end.toISOString() },
  });
  const approverIds = (await listUserIdsWithPermission(session.user.organizationId, PERMISSIONS.attendanceManage)).filter(
    (userId) => userId !== session.user.id,
  );
  await notify(prisma, {
    organizationId: session.user.organizationId,
    userIds: approverIds,
    type: "leave_requested",
    title: "Чөлөөний хүсэлт ирлээ",
    entityType: "LeaveRequest",
    entityId: leave.id,
  });
  revalidatePath("/leave");
}

export async function reviewLeave(formData: FormData) {
  const session = await requireSession();
  const leaveId = String(formData.get("leaveId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  if (!leaveId) throw new Error("Хүсэлт тодорхойгүй байна.");
  if (decision !== "APPROVED" && decision !== "REJECTED") throw new Error("Шийдвэр буруу байна.");
  if (!can(session.user.role as AppRole, PERMISSIONS.attendanceManage)) throw new Error("Зөвшөөрөх эрхгүй байна.");

  const leave = await prisma.leaveRequest.findFirst({
    where: { id: leaveId, organizationId: session.user.organizationId },
    include: { member: { select: { userId: true } } },
  });
  if (!leave) throw new Error("Хүсэлт олдсонгүй.");
  if (leave.status !== "PENDING") throw new Error("Энэ хүсэлт аль хэдийн шийдвэрлэгдсэн байна.");

  await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: { status: decision, approvedById: session.user.id },
  });
  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "leave.review",
    entityType: "LeaveRequest",
    entityId: leaveId,
    newValue: { decision },
  });
  await notify(prisma, {
    organizationId: session.user.organizationId,
    userIds: [leave.member.userId],
    type: "leave_reviewed",
    title: decision === "APPROVED" ? "Чөлөөний хүсэлт зөвшөөрөгдлөө" : "Чөлөөний хүсэлт татгалзагдлаа",
    entityType: "LeaveRequest",
    entityId: leaveId,
  });
  revalidatePath("/leave");
}

const productSchema = z.object({
  name: z.string().trim().min(2, "Барааны нэрийг оруулна уу.").max(160),
  sku: z.string().trim().min(1, "SKU оруулна уу.").max(60),
  barcode: z.string().trim().max(60).optional().or(z.literal("")),
  unit: z.string().trim().min(1).max(20),
  reorderPoint: z.coerce.number().int().min(0).max(100000).default(10),
  openingQuantity: z.coerce.number().int().min(0).max(1000000).default(0),
});

export async function createProduct(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role as AppRole, PERMISSIONS.inventoryManage)) throw new Error("Бараа нэмэх эрхгүй байна.");

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    barcode: formData.get("barcode"),
    unit: formData.get("unit") || "ш",
    reorderPoint: formData.get("reorderPoint"),
    openingQuantity: formData.get("openingQuantity"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Барааны мэдээллийг шалгана уу.");
  const { name, sku, barcode, unit, reorderPoint, openingQuantity } = parsed.data;

  const existing = await prisma.product.findFirst({ where: { organizationId: session.user.organizationId, sku } });
  if (existing) throw new Error("Энэ SKU-тай бараа бүртгэлтэй байна.");

  const product = await prisma.product.create({
    data: { organizationId: session.user.organizationId, name, sku, barcode: barcode || undefined, unit, reorderPoint },
  });

  if (openingQuantity > 0) {
    await prisma.stockMovement.create({
      data: { productId: product.id, type: "RECEIPT", quantity: openingQuantity, note: "Эхний үлдэгдэл", createdById: session.user.id },
    });
  }
  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "inventory.product_create",
    entityType: "Product",
    entityId: product.id,
    newValue: { name: product.name, sku: product.sku, openingQuantity },
  });

  revalidatePath("/inventory");
  redirect("/inventory");
}

const movementSchema = z.object({
  productId: z.string().trim().min(1),
  type: z.enum(["RECEIPT", "ISSUE", "ADJUSTMENT"]),
  quantity: z.coerce.number().int().min(-1000000).max(1000000),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function recordStockMovement(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role as AppRole, PERMISSIONS.inventoryManage)) throw new Error("Барааны хөдөлгөөн бүртгэх эрхгүй байна.");

  const parsed = movementSchema.safeParse({
    productId: formData.get("productId"),
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    note: formData.get("note"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Хөдөлгөөний мэдээллийг шалгана уу.");
  const { productId, type, quantity, note } = parsed.data;
  if (type !== "ADJUSTMENT" && quantity <= 0) throw new Error("Тоо хэмжээ 0-ээс их байна.");
  if (type === "ADJUSTMENT" && quantity === 0) throw new Error("Тохируулгын хэмжээ 0 байж болохгүй.");

  const product = await prisma.product.findFirst({ where: { id: productId, organizationId: session.user.organizationId } });
  if (!product) throw new Error("Бараа олдсонгүй.");

  if (type === "ISSUE") {
    const movements = await prisma.stockMovement.findMany({ where: { productId }, select: { type: true, quantity: true } });
    const onHand = computeStockOnHand(movements);
    if (quantity > onHand) throw new Error(`Үлдэгдэл хүрэлцэхгүй байна (одоогийн үлдэгдэл: ${onHand}).`);
  }

  const movement = await prisma.stockMovement.create({
    data: { productId, type, quantity, note: note || undefined, createdById: session.user.id },
  });
  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "inventory.movement",
    entityType: "StockMovement",
    entityId: movement.id,
    newValue: { productId, type, quantity },
  });

  revalidatePath(`/inventory/${productId}`);
  revalidatePath("/inventory");
}

export async function uploadEvidence(formData: FormData) {
  const session = await requireSession();
  const taskId = String(formData.get("taskId") ?? "").trim();
  const requirementId = String(formData.get("requirementId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const file = formData.get("file");

  if (!taskId || !requirementId) throw new Error("Мэдээлэл дутуу байна.");
  if (!(file instanceof File) || file.size === 0) throw new Error("Файл сонгоно уу.");
  if (file.size > MAX_EVIDENCE_BYTES) throw new Error("Файлын хэмжээ хэт том байна (дээд тал нь 8MB).");

  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: session.user.organizationId },
    include: { assignees: true },
  });
  if (!task) throw new Error("Ажил олдсонгүй.");

  const isAssignee = task.assignees.some((a) => a.memberId === session.user.memberId);
  if (!isAssignee) throw new Error("Зөвхөн хариуцагч нотолгоо хавсаргаж чадна.");

  const requirement = await prisma.evidenceRequirement.findFirst({ where: { id: requirementId, taskId } });
  if (!requirement) throw new Error("Шаардлага олдсонгүй.");

  const saved = await saveUploadedFile(file);
  const existingVersions = await prisma.taskEvidence.count({ where: { requirementId } });

  await prisma.$transaction(
    async (tx) => {
      const asset = await tx.fileAsset.create({ data: saved });
      const evidence = await tx.taskEvidence.create({
        data: {
          taskId,
          requirementId,
          fileAssetId: asset.id,
          uploadedById: session.user.id,
          version: existingVersions + 1,
          note: note || undefined,
        },
      });
      await logAudit(tx, {
        organizationId: session.user.organizationId,
        actorId: session.user.id,
        action: "task.evidence_upload",
        entityType: "TaskEvidence",
        entityId: evidence.id,
        newValue: { taskId, requirementId, fileName: saved.fileName },
      });
    },
    { timeout: 15000 },
  );

  revalidatePath(`/tasks/${taskId}`);
}

export async function markNotificationRead(formData: FormData) {
  const session = await requireSession();
  const notificationId = String(formData.get("notificationId") ?? "").trim();
  if (!notificationId) return;
  await prisma.notification.updateMany({
    where: { id: notificationId, organizationId: session.user.organizationId, userId: session.user.id },
    data: { readAt: new Date() },
  });
  revalidatePath("/");
}

export async function markAllNotificationsRead() {
  const session = await requireSession();
  await prisma.notification.updateMany({
    where: { organizationId: session.user.organizationId, userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/");
}

const purchaseOrderSchema = z.object({
  poNumber: z.string().trim().min(1, "PO дугаар оруулна уу.").max(60),
  supplierName: z.string().trim().min(1, "Нийлүүлэгчийн нэрийг оруулна уу.").max(160),
  invoiceNumber: z.string().trim().max(60).optional().or(z.literal("")),
});

export async function createPurchaseOrder(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role as AppRole, PERMISSIONS.inventoryManage)) throw new Error("Захиалга үүсгэх эрхгүй байна.");

  const parsed = purchaseOrderSchema.safeParse({
    poNumber: formData.get("poNumber"),
    supplierName: formData.get("supplierName"),
    invoiceNumber: formData.get("invoiceNumber"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Мэдээллийг шалгана уу.");
  const { poNumber, supplierName, invoiceNumber } = parsed.data;

  const productIds = formData.getAll("productId").map(String);
  const expectedQuantities = formData.getAll("expectedQuantity").map(String);
  const invoiceQuantities = formData.getAll("invoiceQuantity").map(String);

  const items: { productId: string; expectedQuantity: number; invoiceQuantity: number | null }[] = [];
  for (let i = 0; i < productIds.length; i++) {
    const productId = productIds[i]?.trim();
    const expectedQuantity = Number(expectedQuantities[i]);
    const invoiceQuantityRaw = invoiceQuantities[i]?.trim();
    if (!productId || !Number.isFinite(expectedQuantity) || expectedQuantity <= 0) continue;
    items.push({ productId, expectedQuantity, invoiceQuantity: invoiceQuantityRaw ? Number(invoiceQuantityRaw) : null });
  }
  if (items.length === 0) throw new Error("Дор хаяж нэг бараа оруулна уу.");

  const existing = await prisma.purchaseOrder.findFirst({
    where: { organizationId: session.user.organizationId, poNumber },
  });
  if (existing) throw new Error("Энэ дугаартай захиалга бүртгэлтэй байна.");

  const uniqueProductIds = [...new Set(items.map((i) => i.productId))];
  const productCount = await prisma.product.count({
    where: { organizationId: session.user.organizationId, id: { in: uniqueProductIds } },
  });
  if (productCount !== uniqueProductIds.length) throw new Error("Сонгосон бараа олдсонгүй.");

  const po = await prisma.purchaseOrder.create({
    data: {
      organizationId: session.user.organizationId,
      poNumber,
      supplierName,
      invoiceNumber: invoiceNumber || undefined,
      createdById: session.user.id,
      items: { create: items },
    },
  });
  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "inventory.po_create",
    entityType: "PurchaseOrder",
    entityId: po.id,
    newValue: { poNumber, itemCount: items.length },
  });

  revalidatePath("/inventory/orders");
  redirect(`/inventory/orders/${po.id}`);
}

type MismatchDraft = {
  productId: string;
  type: "MISSING" | "DAMAGED" | "WRONG_PRODUCT" | "WRONG_QUANTITY" | "EXPIRED" | "PACKAGING_DAMAGE" | "SERIAL_MISMATCH" | "DUPLICATE" | "OTHER";
  quantity: number;
  description: string;
  sourceType: "RECEIPT" | "COUNT" | "THREE_WAY";
};

export async function receiveGoods(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role as AppRole, PERMISSIONS.inventoryManage)) throw new Error("Хүлээн авалт бүртгэх эрхгүй байна.");

  const purchaseOrderId = String(formData.get("purchaseOrderId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!purchaseOrderId) throw new Error("Захиалга тодорхойгүй байна.");

  const po = await prisma.purchaseOrder.findFirst({
    where: { id: purchaseOrderId, organizationId: session.user.organizationId },
    include: { items: true },
  });
  if (!po) throw new Error("Захиалга олдсонгүй.");
  if (po.status === "CLOSED") throw new Error("Энэ захиалга хаагдсан байна.");

  const itemIds = formData.getAll("purchaseOrderItemId").map(String);
  const receivedQuantities = formData.getAll("receivedQuantity").map(String);
  const damagedQuantities = formData.getAll("damagedQuantity").map(String);
  const missingQuantities = formData.getAll("missingQuantity").map(String);
  const extraQuantities = formData.getAll("extraQuantity").map(String);

  const poItemsById = new Map(po.items.map((i) => [i.id, i]));
  const receiptItemsData: {
    purchaseOrderItemId: string;
    productId: string;
    expectedQuantity: number;
    receivedQuantity: number;
    damagedQuantity: number;
    missingQuantity: number;
    extraQuantity: number;
  }[] = [];

  for (let i = 0; i < itemIds.length; i++) {
    const poItem = poItemsById.get(itemIds[i]);
    if (!poItem) continue;
    const receivedQuantity = Math.max(0, Number(receivedQuantities[i]) || 0);
    const damagedQuantity = Math.max(0, Number(damagedQuantities[i]) || 0);
    const missingQuantity = Math.max(0, Number(missingQuantities[i]) || 0);
    const extraQuantity = Math.max(0, Number(extraQuantities[i]) || 0);
    if (receivedQuantity === 0 && damagedQuantity === 0 && missingQuantity === 0 && extraQuantity === 0) continue;
    receiptItemsData.push({
      purchaseOrderItemId: poItem.id,
      productId: poItem.productId,
      expectedQuantity: poItem.expectedQuantity,
      receivedQuantity,
      damagedQuantity,
      missingQuantity,
      extraQuantity,
    });
  }
  if (receiptItemsData.length === 0) throw new Error("Хүлээн авсан тоо хэмжээгээ оруулна уу.");

  const mismatches: MismatchDraft[] = [];
  let receiptId = "";

  await prisma.$transaction(async (tx) => {
    const receipt = await tx.inventoryReceipt.create({
      data: {
        organizationId: session.user.organizationId,
        purchaseOrderId,
        receivedById: session.user.id,
        note: note || undefined,
        items: { create: receiptItemsData },
      },
    });
    receiptId = receipt.id;

    for (const item of receiptItemsData) {
      if (item.receivedQuantity > 0) {
        await tx.stockMovement.create({
          data: { productId: item.productId, type: "RECEIPT", quantity: item.receivedQuantity, note: `PO ${po.poNumber}`, createdById: session.user.id },
        });
      }
      if (item.damagedQuantity > 0) {
        mismatches.push({ productId: item.productId, type: "DAMAGED", quantity: item.damagedQuantity, description: `PO ${po.poNumber}: гэмтэлтэй ирлээ`, sourceType: "RECEIPT" });
      }
      if (item.missingQuantity > 0) {
        mismatches.push({ productId: item.productId, type: "MISSING", quantity: item.missingQuantity, description: `PO ${po.poNumber}: дутуу ирлээ`, sourceType: "RECEIPT" });
      }
      if (item.extraQuantity > 0) {
        mismatches.push({ productId: item.productId, type: "WRONG_QUANTITY", quantity: item.extraQuantity, description: `PO ${po.poNumber}: илүү ирлээ`, sourceType: "RECEIPT" });
      }

      const poItem = poItemsById.get(item.purchaseOrderItemId);
      if (poItem?.invoiceQuantity != null && (poItem.expectedQuantity !== poItem.invoiceQuantity || poItem.invoiceQuantity !== item.receivedQuantity)) {
        mismatches.push({
          productId: item.productId,
          type: "WRONG_QUANTITY",
          quantity: Math.abs(poItem.invoiceQuantity - item.receivedQuantity),
          description: `3 талт тулгалт зөрүүтэй: PO ${poItem.expectedQuantity}, нэхэмжлэх ${poItem.invoiceQuantity}, хүлээн авсан ${item.receivedQuantity}`,
          sourceType: "THREE_WAY",
        });
      }
    }

    if (mismatches.length > 0) {
      await tx.inventoryMismatch.createMany({
        data: mismatches.map((m) => ({
          organizationId: session.user.organizationId,
          productId: m.productId,
          type: m.type,
          quantity: m.quantity,
          description: m.description,
          sourceType: m.sourceType,
          sourceId: receipt.id,
        })),
      });
    }

    await tx.purchaseOrder.update({ where: { id: purchaseOrderId }, data: { status: "RECEIVED" } });
  });

  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "inventory.receive",
    entityType: "InventoryReceipt",
    entityId: receiptId,
    newValue: { purchaseOrderId, itemCount: receiptItemsData.length, mismatchCount: mismatches.length },
  });

  if (mismatches.length > 0) {
    const managerIds = (await listUserIdsWithPermission(session.user.organizationId, PERMISSIONS.inventoryManage)).filter(
      (userId) => userId !== session.user.id,
    );
    await notify(prisma, {
      organizationId: session.user.organizationId,
      userIds: managerIds,
      type: "inventory_mismatch",
      title: `${mismatches.length} зөрүү илэрлээ`,
      body: `PO ${po.poNumber}`,
      entityType: "PurchaseOrder",
      entityId: purchaseOrderId,
    });
  }

  revalidatePath(`/inventory/orders/${purchaseOrderId}`);
  revalidatePath("/inventory/orders");
  revalidatePath("/inventory");
  revalidatePath("/inventory/mismatches");
}

export async function recordInventoryCount(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role as AppRole, PERMISSIONS.inventoryManage)) throw new Error("Тооллого хийх эрхгүй байна.");

  const location = String(formData.get("location") ?? "").trim();
  const productIds = formData.getAll("productId").map(String);
  const countedQuantities = formData.getAll("countedQuantity").map(String);

  const products = await prisma.product.findMany({
    where: { organizationId: session.user.organizationId, id: { in: productIds } },
    include: { movements: { select: { type: true, quantity: true } } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const items: { productId: string; systemQuantity: number; countedQuantity: number; difference: number }[] = [];
  for (let i = 0; i < productIds.length; i++) {
    const raw = countedQuantities[i]?.trim();
    if (!raw) continue;
    const product = productMap.get(productIds[i]);
    if (!product) continue;
    const countedQuantity = Math.max(0, Number(raw) || 0);
    const systemQuantity = computeStockOnHand(product.movements);
    items.push({ productId: product.id, systemQuantity, countedQuantity, difference: countedQuantity - systemQuantity });
  }
  if (items.length === 0) throw new Error("Дор хаяж нэг барааны тоог оруулна уу.");

  const mismatches: MismatchDraft[] = [];
  let countId = "";

  await prisma.$transaction(async (tx) => {
    const count = await tx.inventoryCount.create({
      data: {
        organizationId: session.user.organizationId,
        location: location || undefined,
        createdById: session.user.id,
        status: "COMPLETED",
        items: { create: items },
      },
    });
    countId = count.id;

    for (const item of items) {
      if (item.difference !== 0) {
        await tx.stockMovement.create({
          data: { productId: item.productId, type: "ADJUSTMENT", quantity: item.difference, note: "Тооллогын тохируулга", createdById: session.user.id },
        });
        mismatches.push({
          productId: item.productId,
          type: item.difference < 0 ? "MISSING" : "WRONG_QUANTITY",
          quantity: Math.abs(item.difference),
          description: `Тооллого: систем ${item.systemQuantity}, тоолсон ${item.countedQuantity}`,
          sourceType: "COUNT",
        });
      }
    }

    if (mismatches.length > 0) {
      await tx.inventoryMismatch.createMany({
        data: mismatches.map((m) => ({
          organizationId: session.user.organizationId,
          productId: m.productId,
          type: m.type,
          quantity: m.quantity,
          description: m.description,
          sourceType: m.sourceType,
          sourceId: count.id,
        })),
      });
    }
  });

  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "inventory.count",
    entityType: "InventoryCount",
    entityId: countId,
    newValue: { itemCount: items.length, mismatchCount: mismatches.length },
  });

  if (mismatches.length > 0) {
    const managerIds = (await listUserIdsWithPermission(session.user.organizationId, PERMISSIONS.inventoryManage)).filter(
      (userId) => userId !== session.user.id,
    );
    await notify(prisma, {
      organizationId: session.user.organizationId,
      userIds: managerIds,
      type: "inventory_mismatch",
      title: `Тооллогоор ${mismatches.length} зөрүү илэрлээ`,
      entityType: "InventoryCount",
      entityId: countId,
    });
  }

  revalidatePath("/inventory");
  revalidatePath("/inventory/mismatches");
}

export async function resolveMismatch(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role as AppRole, PERMISSIONS.inventoryManage)) throw new Error("Зөрүү шийдвэрлэх эрхгүй байна.");

  const mismatchId = String(formData.get("mismatchId") ?? "").trim();
  const resolvedNote = String(formData.get("resolvedNote") ?? "").trim();
  if (!mismatchId) throw new Error("Зөрүү тодорхойгүй байна.");

  const mismatch = await prisma.inventoryMismatch.findFirst({
    where: { id: mismatchId, organizationId: session.user.organizationId },
  });
  if (!mismatch) throw new Error("Зөрүү олдсонгүй.");
  if (mismatch.status === "RESOLVED") throw new Error("Энэ зөрүү аль хэдийн шийдвэрлэгдсэн байна.");

  await prisma.inventoryMismatch.update({
    where: { id: mismatchId },
    data: { status: "RESOLVED", resolvedById: session.user.id, resolvedNote: resolvedNote || undefined },
  });
  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "inventory.mismatch_resolve",
    entityType: "InventoryMismatch",
    entityId: mismatchId,
    newValue: { resolvedNote: resolvedNote || null },
  });

  revalidatePath("/inventory/mismatches");
}

const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Байгууллагын нэрийг оруулна уу.").max(160),
});

export async function updateOrganization(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role as AppRole, PERMISSIONS.settingsManage)) throw new Error("Тохиргоо өөрчлөх эрхгүй байна.");

  const parsed = updateOrganizationSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Мэдээллийг шалгана уу.");

  await prisma.organization.update({
    where: { id: session.user.organizationId },
    data: { name: parsed.data.name },
  });
  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "organization.update",
    entityType: "Organization",
    entityId: session.user.organizationId,
    newValue: { name: parsed.data.name },
  });

  revalidatePath("/settings");
  revalidatePath("/");
}

const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("И-мэйл хаягаа зөв оруулна уу."),
  jobTitle: z.string().trim().max(120).optional().or(z.literal("")),
});

export async function inviteMemberToOrg(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role as AppRole, PERMISSIONS.settingsManage)) throw new Error("Ажилтан урих эрхгүй байна.");

  const parsed = inviteMemberSchema.safeParse({ email: formData.get("email"), jobTitle: formData.get("jobTitle") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Мэдээллийг шалгана уу.");
  const { email, jobTitle } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Энэ и-мэйл хаягтай бүртгэлтэй хэрэглэгч олдсонгүй. Тэднийг эхлээд EVIDO-д бүртгүүлэхийг хүснэ үү.");

  const existing = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: session.user.organizationId, userId: user.id } },
  });
  if (existing) throw new Error("Энэ хэрэглэгч аль хэдийн байгууллагын гишүүн байна.");

  const roles = await ensureOrgRoles(session.user.organizationId);
  const employeeRole = roles.get("EMPLOYEE");

  const member = await prisma.organizationMember.create({
    data: {
      organizationId: session.user.organizationId,
      userId: user.id,
      status: "ACTIVE",
      jobTitle: jobTitle || undefined,
      roles: employeeRole ? { create: { roleId: employeeRole.id } } : undefined,
    },
  });
  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "member.invite",
    entityType: "OrganizationMember",
    entityId: member.id,
    newValue: { email },
  });
  await notify(prisma, {
    organizationId: session.user.organizationId,
    userIds: [user.id],
    type: "org_invited",
    title: "Байгууллагад нэмэгдлээ",
    body: "Дараагийн удаа нэвтрэхдээ энэ байгууллагаа сонгоно уу.",
  });

  revalidatePath("/settings");
}

const taskTemplateSchema = z.object({
  name: z.string().trim().min(2, "Загварын нэрийг оруулна уу.").max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  priority: z.coerce.number().int().min(1).max(4).default(2),
  difficulty: z.coerce.number().int().min(1).max(5).default(1),
  basePoints: z.coerce.number().min(0).max(1000).default(0),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("LOW"),
});

export async function createTaskTemplate(formData: FormData) {
  const session = await requireSession();
  if (!can(session.user.role as AppRole, PERMISSIONS.projectManage)) throw new Error("Загвар үүсгэх эрхгүй байна.");

  const parsed = taskTemplateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    priority: formData.get("priority"),
    difficulty: formData.get("difficulty"),
    basePoints: formData.get("basePoints"),
    riskLevel: formData.get("riskLevel") || "LOW",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Загварын мэдээллийг шалгана уу.");
  const { name, description, priority, difficulty, basePoints, riskLevel } = parsed.data;

  const checklistItems = formData
    .getAll("checklistItem")
    .map(String)
    .map((s) => s.trim())
    .filter(Boolean);

  const requirementTypes = formData.getAll("requirementType").map(String);
  const requirementTitles = formData.getAll("requirementTitle").map(String);
  const requirementItems: { type: string; title: string }[] = [];
  for (let i = 0; i < requirementTitles.length; i++) {
    const title = requirementTitles[i]?.trim();
    const type = requirementTypes[i]?.trim();
    if (!title || !type) continue;
    requirementItems.push({ type, title });
  }

  const existing = await prisma.taskTemplate.findFirst({
    where: { organizationId: session.user.organizationId, name },
  });
  if (existing) throw new Error("Ийм нэртэй загвар бүртгэлтэй байна.");

  const template = await prisma.taskTemplate.create({
    data: {
      organizationId: session.user.organizationId,
      name,
      description: description || undefined,
      priority,
      difficulty,
      basePoints,
      riskLevel,
      checklistItems: checklistItems.length > 0 ? checklistItems : undefined,
      requirementItems: requirementItems.length > 0 ? requirementItems : undefined,
      createdById: session.user.id,
    },
  });
  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "task_template.create",
    entityType: "TaskTemplate",
    entityId: template.id,
    newValue: { name, checklistCount: checklistItems.length, requirementCount: requirementItems.length },
  });

  revalidatePath("/tasks/templates");
  redirect("/tasks/templates");
}

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Нэрээ оруулна уу.").max(160),
});

export async function updateMyProfile(formData: FormData) {
  const session = await requireSession();
  const parsed = updateProfileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Мэдээллийг шалгана уу.");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name },
  });
  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "user.profile_update",
    entityType: "User",
    entityId: session.user.id,
    newValue: { name: parsed.data.name },
  });

  revalidatePath("/profile");
  revalidatePath("/");
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Одоогийн нууц үгээ оруулна уу."),
    newPassword: z.string().min(8, "Шинэ нууц үг 8-с дээш тэмдэгттэй байх ёстой."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Шинэ нууц үг таарахгүй байна.",
    path: ["confirmPassword"],
  });

export async function changeMyPassword(formData: FormData) {
  const session = await requireSession();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Мэдээллийг шалгана уу.");

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } });
  if (!user?.passwordHash || !verifyPassword(parsed.data.currentPassword, user.passwordHash)) {
    throw new Error("Одоогийн нууц үг буруу байна.");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: hashPassword(parsed.data.newPassword) },
  });
  await logAudit(prisma, {
    organizationId: session.user.organizationId,
    actorId: session.user.id,
    action: "user.password_change",
    entityType: "User",
    entityId: session.user.id,
  });

  revalidatePath("/profile");
}
