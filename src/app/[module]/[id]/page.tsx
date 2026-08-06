import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { computeStockOnHand, getEmployeeDetail, getProductDetail, getProjectDetail, getTaskDetail, listActiveMembers, listMemberTaskScores, listOrgMemberScoreTotals } from "@/lib/queries";
import { handoverTransferTypeLabel, memberStatusLabel, okStatuses, projectStatusLabel, taskBlockReasonLabel, taskDependencyTypeLabel, taskRiskLevelLabel, taskStatusLabel } from "@/lib/labels";
import { can, PERMISSIONS, type AppRole } from "@/lib/permissions";
import { requiredApprovalSteps } from "@/lib/task-machine";
import { DetailScreen } from "@/components/module-screen";

export default async function Page({ params }: { params: Promise<{ module: string; id: string }> }) {
  const { module, id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const organizationId = session.user.organizationId;

  if (module === "projects") {
    const project = await getProjectDetail(id, organizationId);
    if (!project) notFound();
    return (
      <DetailScreen
        slug={module}
        id={id}
        live={{
          kind: "project",
          title: project.name,
          subtitle: project.department?.name ?? "Хэлтэсгүй",
          statusLabel: projectStatusLabel[project.status] ?? project.status,
          statusOk: okStatuses.has(project.status),
          description: project.description || "Тайлбар оруулаагүй байна.",
          progress: project.progress,
          department: project.department?.name ?? "—",
          startDate: project.startDate ? project.startDate.toLocaleDateString("mn-MN") : "—",
          dueDate: project.dueDate ? project.dueDate.toLocaleDateString("mn-MN") : "—",
          tasks: project.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            statusLabel: taskStatusLabel[t.status] ?? t.status,
            ok: t.status === "COMPLETED",
          })),
        }}
      />
    );
  }

  if (module === "tasks") {
    const task = await getTaskDetail(id, organizationId);
    if (!task) notFound();

    const isAssignee = task.assignees.some((a) => a.memberId === session.user.memberId);
    const canReview = can(session.user.role as AppRole, PERMISSIONS.taskReview);
    const history = task.submissions.flatMap((s) =>
      s.reviews.map((r) => ({
        version: s.version,
        decision: r.decision,
        reason: r.reason,
        reviewer: r.reviewer.name,
        at: r.createdAt.toLocaleString("mn-MN"),
      })),
    );
    const approvalStepsRequired = requiredApprovalSteps(task.riskLevel);
    const latestSubmission = task.submissions[0];
    const approvedSoFar = latestSubmission ? latestSubmission.reviews.filter((r) => r.decision === "APPROVED").length : 0;
    const nextStepIsFinal = approvedSoFar + 1 >= approvalStepsRequired;
    const canApprove = nextStepIsFinal
      ? can(session.user.role as AppRole, PERMISSIONS.taskApprove)
      : can(session.user.role as AppRole, PERMISSIONS.taskReview);

    return (
      <DetailScreen
        slug={module}
        id={id}
        live={{
          kind: "task",
          title: task.title,
          subtitle: task.project?.name ?? "Төсөлгүй",
          status: task.status,
          statusLabel: taskStatusLabel[task.status] ?? task.status,
          statusOk: okStatuses.has(task.status),
          description: task.description || "Тайлбар оруулаагүй байна.",
          progress: task.progress,
          projectName: task.project?.name ?? "—",
          priority: task.priority,
          difficulty: task.difficulty,
          basePoints: task.basePoints.toString(),
          dueDate: task.dueAt ? task.dueAt.toLocaleDateString("mn-MN") : "—",
          assignees: task.assignees.map((a) => a.member.user.name),
          createdBy: task.createdBy.name,
          checklist: task.checklist.map((c) => ({ title: c.title, done: Boolean(c.completedAt) })),
          requirements: task.requirements.map((r) => ({
            id: r.id,
            title: r.title,
            fulfilled: r.evidence.length > 0,
            evidence: r.evidence.map((e) => ({
              id: e.id,
              fileAssetId: e.fileAssetId,
              note: e.note,
              uploadedBy: e.uploadedBy.name,
              uploadedAt: e.createdAt.toLocaleString("mn-MN"),
            })),
          })),
          isAssignee,
          canReview,
          canApprove,
          riskLevelLabel: taskRiskLevelLabel[task.riskLevel] ?? task.riskLevel,
          approvalStep: approvedSoFar,
          approvalStepsRequired,
          canUpload: isAssignee && task.status === "IN_PROGRESS",
          blockedReason: task.blockedReason ? (taskBlockReasonLabel[task.blockedReason] ?? task.blockedReason) : null,
          blockedNote: task.blockedNote,
          dependencies: task.dependencies.map((d) => ({
            id: d.dependsOn.id,
            title: d.dependsOn.title,
            statusLabel: taskStatusLabel[d.dependsOn.status] ?? d.dependsOn.status,
            typeLabel: taskDependencyTypeLabel[d.dependencyType] ?? d.dependencyType,
            done: d.dependsOn.status === "COMPLETED",
          })),
          dependents: task.dependents.map((d) => ({
            id: d.task.id,
            title: d.task.title,
            statusLabel: taskStatusLabel[d.task.status] ?? d.task.status,
          })),
          handovers: task.handovers.map((h) => ({
            id: h.id,
            fromName: h.fromMember.user.name,
            toName: h.toMember.user.name,
            typeLabel: handoverTransferTypeLabel[h.transferType] ?? h.transferType,
            note: h.note,
            at: h.createdAt.toLocaleString("mn-MN"),
          })),
          score: task.score
            ? {
                basePoint: task.score.basePoint.toString(),
                deadlineCoefficient: task.score.deadlineCoefficient.toString(),
                qualityCoefficient: task.score.qualityCoefficient.toString(),
                evidenceCoefficient: task.score.evidenceCoefficient.toString(),
                finalScore: task.score.finalScore.toFixed(2),
              }
            : null,
          history,
        }}
      />
    );
  }

  if (module === "employees") {
    const member = await getEmployeeDetail(id, organizationId);
    if (!member) notFound();

    const total = member.assignments.length;
    const completed = member.assignments.filter((a) => a.task.status === "COMPLETED").length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const activeMembers = await listActiveMembers(organizationId);
    const otherMembers = activeMembers.filter((m) => m.id !== id).map((m) => ({ id: m.id, name: m.user.name }));

    const isSelf = session.user.memberId === id;
    const canViewReports = can(session.user.role as AppRole, PERMISSIONS.reportsRead);
    const canViewPerformance = isSelf || canViewReports;

    let performance: { totalScore: string; scoredTaskCount: number; onTimeRate: number; avgQuality: string } | null = null;
    let bonusRecommended = false;
    if (canViewPerformance) {
      const scores = await listMemberTaskScores(id);
      const totalScore = scores.reduce((sum, s) => sum + Number(s.finalScore), 0);
      const onTimeCount = scores.filter((s) => Number(s.deadlineCoefficient) >= 1).length;
      const onTimeRate = scores.length > 0 ? Math.round((onTimeCount / scores.length) * 100) : 0;
      const avgQuality = scores.length > 0 ? (scores.reduce((sum, s) => sum + Number(s.qualityCoefficient), 0) / scores.length) * 5 : 0;
      performance = { totalScore: totalScore.toFixed(1), scoredTaskCount: scores.length, onTimeRate, avgQuality: avgQuality.toFixed(1) };

      if (canViewReports && totalScore > 0) {
        const totals = [...(await listOrgMemberScoreTotals(organizationId)).entries()];
        const sorted = totals.map(([, v]) => v).sort((a, b) => b - a);
        const rank = sorted.findIndex((v) => v === totalScore);
        bonusRecommended = sorted.length > 0 && rank !== -1 && rank < Math.max(1, Math.ceil(sorted.length * 0.2));
      }
    }

    return (
      <DetailScreen
        slug={module}
        id={id}
        live={{
          kind: "employee",
          title: member.user.name,
          subtitle: member.jobTitle ?? "Албан тушаалгүй",
          statusLabel: memberStatusLabel[member.status] ?? member.status,
          statusOk: okStatuses.has(member.status),
          description: `${member.jobTitle ?? "Албан тушаалгүй"} · ${member.department?.name ?? "Хэлтэсгүй"} хэлтэст ажилладаг.`,
          progress: canViewPerformance ? rate : 0,
          email: member.user.email,
          department: member.department?.name ?? "—",
          branch: member.branch?.name ?? "—",
          roles: member.roles.map((r) => r.role.name),
          currentRole: member.roles[0]?.role.name ?? "EMPLOYEE",
          canAssignRole: can(session.user.role as AppRole, PERMISSIONS.settingsManage),
          canReassign: can(session.user.role as AppRole, PERMISSIONS.projectManage),
          canViewPerformance,
          performance,
          bonusRecommended,
          otherMembers,
          tasks: member.assignments.map((a) => ({
            id: a.task.id,
            title: a.task.title,
            status: a.task.status,
            statusLabel: taskStatusLabel[a.task.status] ?? a.task.status,
            ok: a.task.status === "COMPLETED",
          })),
          projects: member.projectMemberships.map((pm) => ({ id: pm.project.id, name: pm.project.name })),
        }}
      />
    );
  }

  if (module === "inventory") {
    const product = await getProductDetail(id, organizationId);
    if (!product) notFound();

    const onHand = computeStockOnHand(product.movements);
    const healthPct = product.reorderPoint > 0 ? Math.round((onHand / product.reorderPoint) * 100) : onHand > 0 ? 100 : 0;
    const statusLabel = onHand <= 0 ? "Дууссан" : onHand <= product.reorderPoint ? "Дуусах дөхсөн" : "Хэвийн";

    return (
      <DetailScreen
        slug={module}
        id={id}
        live={{
          kind: "product",
          title: product.name,
          subtitle: `${product.sku} · ${onHand} ${product.unit}`,
          statusLabel,
          statusOk: onHand > product.reorderPoint,
          description: `${product.name} — захиалах доод хэмжээ ${product.reorderPoint} ${product.unit}.`,
          progress: Math.min(Math.max(healthPct, 0), 100),
          sku: product.sku,
          barcode: product.barcode,
          unit: product.unit,
          onHand,
          reorderPoint: product.reorderPoint,
          canRecord: can(session.user.role as AppRole, PERMISSIONS.inventoryManage),
          movements: product.movements.map((m) => ({
            id: m.id,
            type: m.type,
            quantity: m.quantity,
            note: m.note,
            createdBy: m.createdBy.name,
            at: m.createdAt.toLocaleString("mn-MN"),
          })),
        }}
      />
    );
  }

  notFound();
}
