import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import {
  countAtRiskTasks,
  countUnreadNotifications,
  getMyFocusTask,
  getTaskMetrics,
  getTodayAttendance,
  listRecentNotifications,
  listReviewQueue,
  listTeamWorkload,
  listTopProjects,
} from "@/lib/queries";
import { projectStatusLabel, taskStatusLabel } from "@/lib/labels";
import { can, PERMISSIONS, type AppRole } from "@/lib/permissions";
import { Dashboard } from "@/components/dashboard";

function formatTime(date: Date | null | undefined) {
  if (!date) return null;
  return date.toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" });
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const organizationId = session.user.organizationId;
  const canViewTeam = can(session.user.role as AppRole, PERMISSIONS.reportsRead);

  const [notifications, unreadCount, taskMetrics, focusTaskRow, topProjectRows, reviewQueueRows, workloadRows, atRiskCount, attendance] =
    await Promise.all([
      listRecentNotifications(organizationId, session.user.id),
      countUnreadNotifications(organizationId, session.user.id),
      getTaskMetrics(organizationId),
      getMyFocusTask(organizationId, session.user.memberId),
      listTopProjects(organizationId, 3),
      can(session.user.role as AppRole, PERMISSIONS.taskReview) ? listReviewQueue(organizationId, 4) : Promise.resolve([]),
      canViewTeam ? listTeamWorkload(organizationId, 5) : Promise.resolve([]),
      countAtRiskTasks(organizationId),
      getTodayAttendance(session.user.memberId),
    ]);

  const focusTask = focusTaskRow
    ? {
        title: focusTaskRow.title,
        projectName: focusTaskRow.project?.name ?? "Төсөлгүй",
        dueLabel: focusTaskRow.dueAt ? focusTaskRow.dueAt.toLocaleString("mn-MN", { dateStyle: "medium", timeStyle: "short" }) : "Хугацаагүй",
        progress: focusTaskRow.progress,
        href: `/tasks/${focusTaskRow.id}`,
      }
    : null;

  const topProjects = topProjectRows.map((p) => ({ id: p.id, name: p.name, progress: p.progress, statusLabel: projectStatusLabel[p.status] ?? p.status }));

  const reviewQueue = reviewQueueRows.map((t) => ({
    id: t.id,
    title: t.title,
    projectName: t.project?.name ?? "Төсөлгүй",
    assigneeName: t.assignees[0]?.member.user.name ?? "Оноогоогүй",
    statusLabel: taskStatusLabel[t.status] ?? t.status,
  }));

  const maxWorkload = Math.max(1, ...workloadRows.map((w) => w.activeCount));
  const workload = workloadRows.map((w) => ({ id: w.id, name: w.name, activeCount: w.activeCount, pct: Math.round((w.activeCount / maxWorkload) * 100) }));

  return (
    <Dashboard
      userName={session.user.name ?? "Хэрэглэгч"}
      organizationName={session.user.organizationName}
      notifications={notifications}
      unreadCount={unreadCount}
      taskMetrics={taskMetrics}
      focusTask={focusTask}
      topProjects={topProjects}
      reviewQueue={reviewQueue}
      workload={workload}
      atRiskCount={atRiskCount}
      attendance={{ checkInAt: formatTime(attendance?.checkInAt), checkOutAt: formatTime(attendance?.checkOutAt) }}
      canManageSettings={can(session.user.role as AppRole, PERMISSIONS.settingsManage)}
    />
  );
}
