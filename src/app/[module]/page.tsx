import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { computeStockOnHand, listEmployeeRows, listProductRows, listProjectRows, listReviewQueue, listTaskRows } from "@/lib/queries";
import { memberStatusLabel, okStatuses, projectStatusLabel, taskStatusLabel } from "@/lib/labels";
import { can, PERMISSIONS, type AppRole } from "@/lib/permissions";
import { ModuleScreen } from "@/components/module-screen";

export default async function Page({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const organizationId = session.user.organizationId;
  const userName = session.user.name ?? "?";

  if (module === "projects") {
    const projects = await listProjectRows(organizationId);
    const rows = projects.map((p) => ({
      id: p.id,
      title: p.name,
      subtitle: `${p.department?.name ?? "Хэлтэсгүй"} · ${p._count.tasks} ажил`,
      progressLabel: `${p.progress}%`,
      status: projectStatusLabel[p.status] ?? p.status,
      ok: okStatuses.has(p.status),
    }));
    return (
      <ModuleScreen
        slug={module}
        userName={userName}
        live={{
          icon: "project",
          title: "Төслүүд",
          subtitle: "Байгууллагын бүх төслийн явцыг нэг дор удирдана",
          createHref: "/projects/new",
          metrics: [
            ["Нийт төсөл", String(projects.length), "purple"],
            ["Идэвхтэй", String(projects.filter((p) => p.status === "ACTIVE").length), "blue"],
            ["Эрсдэлтэй", String(projects.filter((p) => p.status === "AT_RISK").length), "amber"],
            ["Дууссан", String(projects.filter((p) => p.status === "COMPLETED").length), "green"],
          ],
          rows,
        }}
      />
    );
  }

  if (module === "tasks") {
    const tasks = await listTaskRows(organizationId);
    const rows = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: `${t.project?.name ?? "Төсөлгүй"} · ${t.dueAt ? t.dueAt.toLocaleDateString("mn-MN") : "Хугацаагүй"}`,
      progressLabel: `${t.progress}%`,
      status: taskStatusLabel[t.status] ?? t.status,
      ok: okStatuses.has(t.status),
    }));
    return (
      <ModuleScreen
        slug={module}
        userName={userName}
        live={{
          icon: "task",
          title: "Даалгавар",
          subtitle: "Бүх ажлыг төлөвлөж, явцыг бодитоор хянах",
          createHref: "/tasks/new",
          metrics: [
            ["Нийт даалгавар", String(tasks.length), "purple"],
            ["Явцад", String(tasks.filter((t) => t.status === "IN_PROGRESS").length), "blue"],
            ["Шалгуулах", String(tasks.filter((t) => t.status === "SUBMITTED" || t.status === "UNDER_REVIEW").length), "amber"],
            ["Дууссан", String(tasks.filter((t) => t.status === "COMPLETED").length), "green"],
          ],
          rows,
        }}
      />
    );
  }

  if (module === "approvals") {
    const tasks = await listReviewQueue(organizationId, 200);
    const rows = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: `${t.project?.name ?? "Төсөлгүй"} · ${t.assignees[0]?.member.user.name ?? "Хариуцагчгүй"}`,
      progressLabel: `${t.progress}%`,
      status: taskStatusLabel[t.status] ?? t.status,
      ok: okStatuses.has(t.status),
    }));
    return (
      <ModuleScreen
        slug="tasks"
        userName={userName}
        live={{
          icon: "task",
          title: "Баталгаажуулалт",
          subtitle: "Шалгуулахаар ирсэн ажлуудыг хянаж баталгаажуулна",
          metrics: [
            ["Нийт хүлээгдэж буй", String(tasks.length), "purple"],
            ["Илгээсэн", String(tasks.filter((t) => t.status === "SUBMITTED").length), "blue"],
            ["Шалгагдаж буй", String(tasks.filter((t) => t.status === "UNDER_REVIEW").length), "amber"],
            ["Өндөр эрсдэлтэй", String(tasks.filter((t) => t.riskLevel === "HIGH" || t.riskLevel === "CRITICAL").length), "red"],
          ],
          rows,
        }}
      />
    );
  }

  if (module === "employees") {
    const members = await listEmployeeRows(organizationId);
    const canViewReports = can(session.user.role as AppRole, PERMISSIONS.reportsRead);
    const rows = members.map((m) => {
      const canViewThisRate = canViewReports || m.id === session.user.memberId;
      const total = m.assignments.length;
      const completed = m.assignments.filter((a) => a.task.status === "COMPLETED").length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        id: m.id,
        title: m.user.name,
        subtitle: `${m.jobTitle ?? "Албан тушаалгүй"} · ${m.department?.name ?? "Хэлтэсгүй"}`,
        progressLabel: canViewThisRate ? `${rate}%` : "—",
        status: memberStatusLabel[m.status] ?? m.status,
        ok: okStatuses.has(m.status),
      };
    });
    return (
      <ModuleScreen
        slug={module}
        userName={userName}
        live={{
          icon: "employee",
          title: "Ажилтнууд",
          subtitle: "Багийн бүтэц, гүйцэтгэлийг удирдах",
          metrics: [
            ["Нийт ажилтан", String(members.length), "purple"],
            ["Идэвхтэй", String(members.filter((m) => m.status === "ACTIVE").length), "blue"],
            ["Урьсан", String(members.filter((m) => m.status === "INVITED").length), "amber"],
            ["Идэвхгүй", String(members.filter((m) => m.status === "SUSPENDED" || m.status === "ARCHIVED").length), "green"],
          ],
          rows,
        }}
      />
    );
  }

  if (module === "inventory") {
    const products = await listProductRows(organizationId);
    const enriched = products.map((p) => ({ ...p, onHand: computeStockOnHand(p.movements) }));
    const rows = enriched.map((p) => {
      const healthPct = p.reorderPoint > 0 ? Math.round((p.onHand / p.reorderPoint) * 100) : p.onHand > 0 ? 100 : 0;
      const status = p.onHand <= 0 ? "Дууссан" : p.onHand <= p.reorderPoint ? "Дуусах дөхсөн" : "Хэвийн";
      return {
        id: p.id,
        title: p.name,
        subtitle: `${p.sku}${p.barcode ? ` · ${p.barcode}` : ""}`,
        progressLabel: `${p.onHand} ${p.unit}`,
        status: `${status} (${Math.min(healthPct, 999)}%)`,
        ok: p.onHand > p.reorderPoint,
      };
    });
    return (
      <ModuleScreen
        slug={module}
        userName={userName}
        live={{
          icon: "product",
          title: "Агуулах ба материал",
          subtitle: "Бараа материалын үлдэгдэл, хөдөлгөөнийг хянах",
          createHref: can(session.user.role as AppRole, PERMISSIONS.inventoryManage) ? "/inventory/new" : undefined,
          secondaryLinks: can(session.user.role as AppRole, PERMISSIONS.inventoryManage)
            ? [
                { href: "/inventory/orders", label: "Захиалга" },
                { href: "/inventory/count/new", label: "Тооллого" },
                { href: "/inventory/mismatches", label: "Зөрүү" },
              ]
            : undefined,
          metrics: [
            ["Нийт нэр төрөл", String(enriched.length), "purple"],
            ["Хэвийн", String(enriched.filter((p) => p.onHand > p.reorderPoint).length), "green"],
            ["Дуусах дөхсөн", String(enriched.filter((p) => p.onHand > 0 && p.onHand <= p.reorderPoint).length), "amber"],
            ["Дууссан", String(enriched.filter((p) => p.onHand <= 0).length), "red"],
          ],
          rows,
        }}
      />
    );
  }

  notFound();
}
