import { ArrowLeft, Briefcase, Building2, Mail, MapPin, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getMyProfile } from "@/lib/queries";
import { memberStatusLabel, okStatuses, roleLabel } from "@/lib/labels";
import { ChangePasswordForm, ProfileNameForm } from "@/components/profile-panel";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const member = await getMyProfile(session.user.memberId, session.user.organizationId);
  if (!member) redirect("/");

  return (
    <main className="standalone">
      <header className="module-header">
        <Link href="/" className="back"><ArrowLeft /> EVIDO</Link>
        <div className="module-org"><UserRound /> Миний профайл</div>
      </header>
      <section className="module-content">
        <div className="module-heading">
          <div><h1>{member.user.name}</h1><p>{member.jobTitle ?? "Албан тушаалгүй"} · {member.department?.name ?? "Хэлтэсгүй"}</p></div>
        </div>

        <article className="panel detail-side" style={{ padding: 24, marginBottom: 16, maxWidth: 560 }}>
          <h2>Мэдээлэл</h2>
          <dl>
            <dt><Mail size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />И-мэйл</dt>
            <dd>{member.user.email}</dd>
            <dt><Building2 size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />Байгууллага</dt>
            <dd>{session.user.organizationName}</dd>
            <dt><Briefcase size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />Хэлтэс</dt>
            <dd>{member.department?.name ?? "—"}</dd>
            <dt><MapPin size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />Салбар</dt>
            <dd>{member.branch?.name ?? "—"}</dd>
            <dt><ShieldCheck size={13} style={{ verticalAlign: "-2px", marginRight: 4 }} />Эрх</dt>
            <dd>{member.roles.length ? member.roles.map((r) => roleLabel[r.role.name] ?? r.role.name).join(", ") : "Оноогоогүй"}</dd>
            <dt>Төлөв</dt>
            <dd><span className={`pill ${okStatuses.has(member.status) ? "ok" : "warn"}`}>{memberStatusLabel[member.status] ?? member.status}</span></dd>
          </dl>
          <Link href={`/employees/${member.id}`} className="view-all" style={{ marginTop: 16 }}>Миний гүйцэтгэл, ажлууд харах →</Link>
        </article>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, maxWidth: 900 }}>
          <article className="panel" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, margin: "0 0 14px" }}>Нэр өөрчлөх</h2>
            <ProfileNameForm currentName={member.user.name} />
          </article>
          <article className="panel" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, margin: "0 0 14px" }}>Нууц үг солих</h2>
            <ChangePasswordForm />
          </article>
        </div>
      </section>
    </main>
  );
}
