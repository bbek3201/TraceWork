import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FolderKanban } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { listDepartments } from "@/lib/queries";
import { createProject } from "@/lib/actions";

export default async function NewProjectPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const departments = await listDepartments(session.user.organizationId);

  return (
    <main className="standalone">
      <header className="module-header">
        <Link href="/projects" className="back"><ArrowLeft /> Төслүүд</Link>
        <div className="module-org"><FolderKanban /> Шинэ төсөл</div>
      </header>
      <section className="module-content">
        <div className="module-heading">
          <div><h1>Шинэ төсөл үүсгэх</h1><p>Төслийн үндсэн мэдээллийг бөглөнө үү</p></div>
        </div>
        <article className="panel" style={{ padding: 26 }}>
          <form action={createProject} className="simple-form">
            <label>
              Төслийн нэр
              <input name="name" required minLength={2} placeholder="River Garden" />
            </label>
            <label>
              Тайлбар
              <textarea name="description" rows={4} placeholder="Төслийн товч тайлбар" />
            </label>
            <label>
              Хэлтэс
              <select name="departmentId" defaultValue="">
                <option value="">Сонгоогүй</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
            <label>
              Эхлэх огноо
              <input name="startDate" type="date" />
            </label>
            <label>
              Дуусах хугацаа
              <input name="dueDate" type="date" />
            </label>
            <button className="glow-button submit" type="submit">Төсөл үүсгэх</button>
          </form>
        </article>
      </section>
    </main>
  );
}
