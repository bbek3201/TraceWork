import { ArrowLeft, Building2, Users } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getTodayAttendance, listTodayAttendanceRows } from "@/lib/queries";
import { attendanceStatusLabel } from "@/lib/labels";
import { can, PERMISSIONS, type AppRole } from "@/lib/permissions";
import { AttendancePanel } from "@/components/attendance-panel";

function formatTime(date: Date | null | undefined) {
  if (!date) return null;
  return date.toLocaleTimeString("mn-MN", { hour: "2-digit", minute: "2-digit" });
}

export default async function AttendancePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const organizationId = session.user.organizationId;

  const canManage = can(session.user.role as AppRole, PERMISSIONS.attendanceManage);
  const own = await getTodayAttendance(session.user.memberId);
  const rows = canManage ? await listTodayAttendanceRows(organizationId) : [];

  const present = rows.filter((r) => r.checkInAt).length;
  const late = rows.filter((r) => r.status === "LATE").length;

  return (
    <main className="standalone">
      <header className="module-header">
        <Link href="/" className="back"><ArrowLeft /> EVIDO</Link>
        <div className="module-org"><Building2 /> Ирц</div>
      </header>
      <section className="module-content">
        <div className="module-heading">
          <div><h1>Ирц</h1><p>Ажлын цагаа бүртгэж, багийн ирцийг хянана</p></div>
        </div>
        <AttendancePanel checkInAt={formatTime(own?.checkInAt)} checkOutAt={formatTime(own?.checkOutAt)} />
        {canManage && (
          <article className="panel data-panel" style={{ marginTop: 16 }}>
            <div className="data-toolbar">
              <b style={{ padding: "0 4px", fontSize: 13 }}>
                Багийн өнөөдрийн ирц ({present} ирсэн{late ? `, ${late} хоцорсон` : ""})
              </b>
            </div>
            <div className="data-head"><span>Ажилтан</span><span>Төлөв</span><span>Ирсэн / Явсан</span><span /></div>
            {rows.map((r) => (
              <div className="data-row" key={r.id}>
                <span className="row-main"><i><Users size={20} /></i><b>{r.member.user.name}</b><small>{r.member.department?.name ?? "Хэлтэсгүй"}</small></span>
                <span className={`pill ${r.status === "PRESENT" ? "ok" : "warn"}`}>{attendanceStatusLabel[r.status] ?? r.status}</span>
                <span style={{ fontSize: 12, color: "#9aa5b2" }}>{formatTime(r.checkInAt) ?? "—"} / {formatTime(r.checkOutAt) ?? "—"}</span>
                <span />
              </div>
            ))}
            {rows.length === 0 && (
              <div className="empty"><p>Өнөөдөр хэн ч ирц бүртгүүлээгүй байна.</p></div>
            )}
          </article>
        )}
      </section>
    </main>
  );
}
