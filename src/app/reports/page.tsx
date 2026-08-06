import { AlertTriangle, ArrowLeft, BarChart3, Boxes, CalendarDays, CheckCircle2, ClipboardCheck, Clock3, FolderKanban, TrendingUp } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getOrgReportSummary, listActiveMembers, listOrgMemberScoreTotals } from "@/lib/queries";
import { can, PERMISSIONS, type AppRole } from "@/lib/permissions";

function StatCard({ icon: Icon, label, value, color }: { icon: typeof BarChart3; label: string; value: string; color: string }) {
  return (
    <article className="panel" style={{ padding: 16, display: "flex", alignItems: "center", gap: 14 }}>
      <span style={{ width: 46, height: 46, borderRadius: 12, display: "grid", placeItems: "center", color, background: `${color}18`, border: `1px solid ${color}66` }}>
        <Icon size={22} />
      </span>
      <div><small className="muted">{label}</small><br /><strong style={{ fontSize: 22 }}>{value}</strong></div>
    </article>
  );
}

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!can(session.user.role as AppRole, PERMISSIONS.reportsRead)) redirect("/");

  const organizationId = session.user.organizationId;
  const [summary, members, scoreTotals] = await Promise.all([
    getOrgReportSummary(organizationId),
    listActiveMembers(organizationId),
    listOrgMemberScoreTotals(organizationId),
  ]);

  const topPerformers = members
    .map((m) => ({ id: m.id, name: m.user.name, score: scoreTotals.get(m.id) ?? 0 }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <main className="standalone">
      <header className="module-header">
        <Link href="/" className="back"><ArrowLeft /> EVIDO</Link>
        <div className="module-org"><BarChart3 /> Тайлан ба шинжилгээ</div>
      </header>
      <section className="module-content">
        <div className="module-heading">
          <div><h1>Тайлан ба шинжилгээ</h1><p>Байгууллагын гүйцэтгэлийг бодит мэдээллээр хэмжих</p></div>
        </div>

        <h2 style={{ fontSize: 14, color: "#8d99a8", margin: "18px 0 10px" }}>Төслүүд</h2>
        <div className="big-metrics">
          <StatCard icon={FolderKanban} label="Нийт төсөл" value={String(summary.totalProjects)} color="#9b6cff" />
          <StatCard icon={CheckCircle2} label="Идэвхтэй" value={String(summary.activeProjects)} color="#4b91ff" />
          <StatCard icon={AlertTriangle} label="Эрсдэлтэй" value={String(summary.atRiskProjects)} color="#f5a623" />
          <StatCard icon={CheckCircle2} label="Дууссан" value={String(summary.completedProjects)} color="#50c878" />
        </div>

        <h2 style={{ fontSize: 14, color: "#8d99a8", margin: "24px 0 10px" }}>Даалгавар</h2>
        <div className="big-metrics">
          <StatCard icon={ClipboardCheck} label="Нийт даалгавар" value={String(summary.totalTasks)} color="#9b6cff" />
          <StatCard icon={TrendingUp} label="Гүйцэтгэлийн хувь" value={`${summary.taskCompletionRate}%`} color="#4b91ff" />
          <StatCard icon={Clock3} label="Хугацаандаа дуусгасан" value={`${summary.onTimeRate}%`} color="#50c878" />
          <StatCard icon={AlertTriangle} label="Хоцорсон" value={String(summary.overdueTasks)} color="#ff4050" />
        </div>

        <h2 style={{ fontSize: 14, color: "#8d99a8", margin: "24px 0 10px" }}>Ирц ба чөлөө · Агуулах</h2>
        <div className="big-metrics">
          <StatCard icon={CalendarDays} label="Өнөөдөр ирсэн" value={String(summary.presentToday)} color="#50c878" />
          <StatCard icon={Clock3} label="Өнөөдөр хоцорсон" value={String(summary.lateToday)} color="#f5a623" />
          <StatCard icon={CalendarDays} label="Хүлээгдэж буй чөлөө" value={String(summary.pendingLeave)} color="#4b91ff" />
          <StatCard icon={Boxes} label="Нээлттэй зөрүү" value={String(summary.openMismatches)} color="#ff4050" />
        </div>

        <article className="panel" style={{ marginTop: 24, padding: 20 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>
            <h2>Шилдэг гүйцэтгэлтэй ажилтнууд</h2>
            <Link href="/employees">Бүх ажилтан</Link>
          </div>
          {topPerformers.length === 0 && <p className="muted">Дууссан, оноотой ажил хараахан алга.</p>}
          {topPerformers.map((p, i) => (
            <Link key={p.id} href={`/employees/${p.id}`} className="project-row" style={{ textDecoration: "none", color: "inherit" }}>
              <span className="project-thumb">{i + 1}</span>
              <div><b>{p.name}</b></div>
              <strong>{p.score.toFixed(1)}</strong>
            </Link>
          ))}
        </article>
      </section>
    </main>
  );
}
