import { ArrowLeft, ClipboardCheck, Plus } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { listTaskTemplates } from "@/lib/queries";
import { evidenceTypeLabel, taskRiskLevelLabel } from "@/lib/labels";
import { can, PERMISSIONS, type AppRole } from "@/lib/permissions";

export default async function TaskTemplatesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const canManage = can(session.user.role as AppRole, PERMISSIONS.projectManage);
  const templates = await listTaskTemplates(session.user.organizationId);

  return (
    <main className="standalone">
      <header className="module-header">
        <Link href="/tasks" className="back"><ArrowLeft /> Даалгавар</Link>
        <div className="module-org"><ClipboardCheck /> Ажлын загвар</div>
      </header>
      <section className="module-content">
        <div className="module-heading">
          <div><h1>Ажлын загварууд</h1><p>Давтагдах ажлын чеклист, шаардлагатай нотолгоог урьдчилан бэлдэж хугацаа хэмнэ</p></div>
          {canManage && (
            <Link href="/tasks/templates/new" className="glow-button new-action" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", height: 42, padding: "0 16px", borderRadius: 7 }}>
              <Plus size={18} /> Шинэ загвар
            </Link>
          )}
        </div>
        <article className="panel data-panel">
          <div className="data-head"><span>Загвар</span><span>Эрсдэл</span><span>Агуулга</span><span /></div>
          {templates.map((t) => {
            const checklist = Array.isArray(t.checklistItems) ? (t.checklistItems as string[]) : [];
            const requirements = Array.isArray(t.requirementItems) ? (t.requirementItems as { type: string; title: string }[]) : [];
            return (
              <Link href={`/tasks/new?templateId=${t.id}`} className="data-row" key={t.id}>
                <span className="row-main">
                  <i><ClipboardCheck size={20} /></i>
                  <b>{t.name}</b>
                  <small>{t.description || "Тайлбаргүй"}</small>
                </span>
                <span className={`pill ${t.riskLevel === "LOW" || t.riskLevel === "MEDIUM" ? "ok" : "warn"}`}>{taskRiskLevelLabel[t.riskLevel] ?? t.riskLevel}</span>
                <span style={{ fontSize: 12, color: "#9aa5b2" }}>
                  {checklist.length} чеклист · {requirements.length} нотолгоо{requirements.length > 0 ? ` (${requirements.map((r) => evidenceTypeLabel[r.type] ?? r.type).join(", ")})` : ""}
                </span>
                <span />
              </Link>
            );
          })}
          {templates.length === 0 && <div className="empty"><p>Загвар алга.</p></div>}
        </article>
      </section>
    </main>
  );
}
