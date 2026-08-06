import { ArrowLeft, Building2, CalendarDays } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { listLeaveRequests } from "@/lib/queries";
import { leaveStatusLabel, leaveTypeLabel, okStatuses } from "@/lib/labels";
import { can, PERMISSIONS, type AppRole } from "@/lib/permissions";
import { LeaveRequestForm, LeaveReviewActions } from "@/components/leave-panel";

export default async function LeavePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const canManage = can(session.user.role as AppRole, PERMISSIONS.attendanceManage);
  const all = await listLeaveRequests(session.user.organizationId);
  const rows = canManage ? all : all.filter((r) => r.memberId === session.user.memberId);

  return (
    <main className="standalone">
      <header className="module-header">
        <Link href="/" className="back"><ArrowLeft /> EVIDO</Link>
        <div className="module-org"><Building2 /> Чөлөө</div>
      </header>
      <section className="module-content">
        <div className="module-heading">
          <div><h1>Чөлөөний хүсэлт</h1><p>{canManage ? "Байгууллагын бүх чөлөөний хүсэлтийг удирдах" : "Өөрийн чөлөөний хүсэлтийг гаргах, түүхээ харах"}</p></div>
        </div>
        <article className="panel" style={{ padding: 24, marginBottom: 16 }}>
          <h2>Шинэ хүсэлт</h2>
          <LeaveRequestForm />
        </article>
        <article className="panel data-panel">
          <div className="data-toolbar"><b style={{ padding: "0 4px", fontSize: 13 }}>{canManage ? "Бүх хүсэлт" : "Миний хүсэлтүүд"} ({rows.length})</b></div>
          <div className="data-head"><span>Ажилтан / төрөл</span><span>Төлөв</span><span>Хугацаа</span><span /></div>
          {rows.map((r) => (
            <div className="data-row" key={r.id} style={{ gridTemplateColumns: "minmax(220px,1fr) 130px 180px 170px" }}>
              <span className="row-main">
                <i><CalendarDays size={20} /></i>
                <b>{leaveTypeLabel[r.leaveType] ?? r.leaveType}{canManage ? ` · ${r.member.user.name}` : ""}</b>
                <small>{r.reason || "Шалтгаан оруулаагүй"}</small>
              </span>
              <span className={`pill ${okStatuses.has(r.status) ? "ok" : "warn"}`}>{leaveStatusLabel[r.status] ?? r.status}</span>
              <span style={{ fontSize: 12, color: "#9aa5b2" }}>
                {r.startDate.toLocaleDateString("mn-MN")} – {r.endDate.toLocaleDateString("mn-MN")}
              </span>
              {canManage && r.status === "PENDING" ? (
                <LeaveReviewActions leaveId={r.id} />
              ) : canManage && r.status === "APPROVED" ? (
                <Link href={`/employees/${r.memberId}`} style={{ fontSize: 11.5, color: "#aa7dff" }}>Ажил шилжүүлэх</Link>
              ) : (
                <span />
              )}
            </div>
          ))}
          {rows.length === 0 && <div className="empty"><p>Одоогоор хүсэлт алга.</p></div>}
        </article>
      </section>
    </main>
  );
}
