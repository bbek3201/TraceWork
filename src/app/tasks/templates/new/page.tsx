import { ArrowLeft, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { evidenceTypeLabel } from "@/lib/labels";
import { can, PERMISSIONS, type AppRole } from "@/lib/permissions";
import { createTaskTemplate } from "@/lib/actions";

const CHECKLIST_ROWS = 5;
const REQUIREMENT_ROWS = 4;
const EVIDENCE_TYPES = [
  "PHOTO", "BEFORE_AFTER", "VIDEO", "PDF", "WORD", "EXCEL", "DOCUMENT",
  "BARCODE", "QR", "CHECKLIST", "QUANTITY", "GPS", "DIGITAL_SIGNATURE",
  "CUSTOMER_SIGNATURE", "NOTE", "URL",
];

export default async function NewTaskTemplatePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!can(session.user.role as AppRole, PERMISSIONS.projectManage)) redirect("/tasks/templates");

  return (
    <main className="standalone">
      <header className="module-header">
        <Link href="/tasks/templates" className="back"><ArrowLeft /> Загварууд</Link>
        <div className="module-org"><ClipboardCheck /> Шинэ загвар</div>
      </header>
      <section className="module-content">
        <div className="module-heading">
          <div><h1>Шинэ ажлын загвар</h1><p>Давтагдах ажилд ашиглах стандарт чеклист, шаардлагатай нотолгоог бэлдэнэ</p></div>
        </div>
        <article className="panel" style={{ padding: 26 }}>
          <form action={createTaskTemplate} className="simple-form">
            <label>Загварын нэр<input name="name" required minLength={2} placeholder="Бетон цутгалт" /></label>
            <label>Тайлбар<textarea name="description" rows={3} placeholder="Заавал биш" /></label>

            <label>
              Эрсдэлийн түвшин
              <select name="riskLevel" defaultValue="LOW">
                <option value="LOW">Бага</option>
                <option value="MEDIUM">Дунд</option>
                <option value="HIGH">Өндөр (2 шатны баталгаажуулалт)</option>
                <option value="CRITICAL">Маш өндөр (3 шатны баталгаажуулалт)</option>
              </select>
            </label>
            <label>Ач холбогдол (1–4)<input name="priority" type="number" min={1} max={4} defaultValue={2} /></label>
            <label>Түвэгшил (1–5)<input name="difficulty" type="number" min={1} max={5} defaultValue={1} /></label>
            <label>Үндсэн оноо<input name="basePoints" type="number" min={0} step="0.5" defaultValue={10} /></label>

            <div style={{ marginTop: 6 }}>
              <b style={{ fontSize: 12, color: "#c8d0da" }}>Чеклист</b>
              {Array.from({ length: CHECKLIST_ROWS }).map((_, i) => (
                <input key={i} name="checklistItem" placeholder={`Чеклистийн зүйл ${i + 1} (заавал биш)`} style={{ display: "block", width: "100%", marginTop: 8, background: "#0a141f", border: "1px solid #263746", borderRadius: 8, padding: "10px 12px", color: "#fff" }} />
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              <b style={{ fontSize: 12, color: "#c8d0da" }}>Шаардлагатай нотолгоо</b>
              {Array.from({ length: REQUIREMENT_ROWS }).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <select name="requirementType" defaultValue="" style={{ flex: 1, minWidth: 160, background: "#0a141f", border: "1px solid #263746", borderRadius: 8, padding: "10px 12px", color: "#fff" }}>
                    <option value="">Төрөл сонгоогүй</option>
                    {EVIDENCE_TYPES.map((t) => (
                      <option key={t} value={t}>{evidenceTypeLabel[t] ?? t}</option>
                    ))}
                  </select>
                  <input name="requirementTitle" placeholder="Нэр (жишээ: Гүйцэтгэлийн зураг)" style={{ flex: 2, minWidth: 200, background: "#0a141f", border: "1px solid #263746", borderRadius: 8, padding: "10px 12px", color: "#fff" }} />
                </div>
              ))}
            </div>

            <button className="glow-button submit" type="submit" style={{ marginTop: 16 }}>Загвар үүсгэх</button>
          </form>
        </article>
      </section>
    </main>
  );
}
