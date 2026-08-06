import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getTaskTemplate, listActiveMembers, listProjectOptions, listTaskOptions } from "@/lib/queries";
import { taskStatusLabel } from "@/lib/labels";
import { createTask } from "@/lib/actions";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ templateId?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const organizationId = session.user.organizationId;
  const { templateId } = await searchParams;
  const [projects, members, taskOptions, template] = await Promise.all([
    listProjectOptions(organizationId),
    listActiveMembers(organizationId),
    listTaskOptions(organizationId),
    templateId ? getTaskTemplate(templateId, organizationId) : Promise.resolve(null),
  ]);

  return (
    <main className="standalone">
      <header className="module-header">
        <Link href="/tasks" className="back"><ArrowLeft /> Даалгавар</Link>
        <div className="module-org"><ClipboardCheck /> Шинэ даалгавар</div>
      </header>
      <section className="module-content">
        <div className="module-heading">
          <div>
            <h1>Шинэ даалгавар үүсгэх</h1>
            <p>Ажлын мэдээлэл, хариуцагч, шаардлагыг тохируулна уу</p>
          </div>
          {!template && (
            <Link href="/tasks/templates" style={{ fontSize: 13, color: "#7dd3fc" }}>Загвараас үүсгэх →</Link>
          )}
        </div>
        <article className="panel" style={{ padding: 26 }}>
          {projects.length === 0 ? (
            <p className="muted">Эхлээд <Link href="/projects/new">төсөл үүсгэх</Link> шаардлагатай.</p>
          ) : (
            <form action={createTask} className="simple-form">
              {template && (
                <p className="muted" style={{ marginTop: -4 }}>
                  «{template.name}» загвараас {Array.isArray(template.checklistItems) ? template.checklistItems.length : 0} чеклист,{" "}
                  {Array.isArray(template.requirementItems) ? template.requirementItems.length : 0} нотолгооны шаардлага орно.
                </p>
              )}
              <input type="hidden" name="templateId" value={templateId ?? ""} />
              <label>
                Ажлын нэр
                <input name="title" required minLength={2} placeholder="Суурийн арматур угсралт" defaultValue={template?.name ?? ""} />
              </label>
              <label>
                Тайлбар
                <textarea name="description" rows={4} placeholder="Ажлын товч тайлбар" defaultValue={template?.description ?? ""} />
              </label>
              <label>
                Төсөл
                <select name="projectId" required defaultValue="">
                  <option value="" disabled>Сонгоно уу</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Хариуцагч
                <select name="assigneeMemberId" defaultValue="">
                  <option value="">Оноогоогүй</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.user.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Эрсдэлийн түвшин
                <select name="riskLevel" defaultValue={template?.riskLevel ?? "LOW"}>
                  <option value="LOW">Бага</option>
                  <option value="MEDIUM">Дунд</option>
                  <option value="HIGH">Өндөр (2 шатны баталгаажуулалт)</option>
                  <option value="CRITICAL">Маш өндөр (3 шатны баталгаажуулалт)</option>
                </select>
              </label>
              <label>
                Ач холбогдол (1–4)
                <input name="priority" type="number" min={1} max={4} defaultValue={template?.priority ?? 2} />
              </label>
              <label>
                Түвэгшил (1–5)
                <input name="difficulty" type="number" min={1} max={5} defaultValue={template?.difficulty ?? 1} />
              </label>
              <label>
                Үндсэн оноо
                <input name="basePoints" type="number" min={0} step="0.5" defaultValue={template ? Number(template.basePoints) : 10} />
              </label>
              <label>
                Дуусах хугацаа
                <input name="dueAt" type="datetime-local" />
              </label>
              <label>
                Өмнөх ажил (заавал биш)
                <select name="dependsOnTaskId" defaultValue="">
                  <option value="">Хамааралгүй</option>
                  {taskOptions.map((t) => (
                    <option key={t.id} value={t.id}>{t.title} ({taskStatusLabel[t.status] ?? t.status})</option>
                  ))}
                </select>
              </label>
              <label>
                Хамаарлын төрөл
                <select name="dependencyType" defaultValue="FINISH_TO_START">
                  <option value="FINISH_TO_START">Өмнөх дуусаад эхэлнэ (FS)</option>
                  <option value="START_TO_START">Хамт эхэлнэ (SS)</option>
                  <option value="FINISH_TO_FINISH">Хамт дуусна (FF)</option>
                </select>
              </label>
              <button className="glow-button submit" type="submit">Даалгавар үүсгэх</button>
            </form>
          )}
        </article>
      </section>
    </main>
  );
}
