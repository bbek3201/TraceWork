import { ArrowLeft, Building2, Settings, UserPlus } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getOrganization, listOrgMembersWithRoles } from "@/lib/queries";
import { memberStatusLabel, roleLabel } from "@/lib/labels";
import { can, PERMISSIONS, type AppRole } from "@/lib/permissions";
import { InviteMemberForm, OrgNameForm, SettingsRoleForm } from "@/components/settings-panel";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!can(session.user.role as AppRole, PERMISSIONS.settingsManage)) redirect("/");

  const [organization, members] = await Promise.all([
    getOrganization(session.user.organizationId),
    listOrgMembersWithRoles(session.user.organizationId),
  ]);
  if (!organization) redirect("/");

  return (
    <main className="standalone">
      <header className="module-header">
        <Link href="/" className="back"><ArrowLeft /> EVIDO</Link>
        <div className="module-org"><Settings /> Байгууллагын тохиргоо</div>
      </header>
      <section className="module-content">
        <div className="module-heading">
          <div><h1>Байгууллагын тохиргоо</h1><p>Нэр, гишүүд болон тэдний эрхийг удирдах</p></div>
        </div>

        <article className="panel" style={{ padding: 24, marginBottom: 16 }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><Building2 size={18} /> Байгууллагын мэдээлэл</h2>
          <OrgNameForm currentName={organization.name} />
        </article>

        <article className="panel" style={{ padding: 24, marginBottom: 16 }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><UserPlus size={18} /> Гишүүн урих</h2>
          <InviteMemberForm />
        </article>

        <article className="panel data-panel">
          <div className="data-toolbar"><b style={{ padding: "0 4px", fontSize: 13 }}>Гишүүд ба эрх ({members.length})</b></div>
          <div className="data-head"><span>Ажилтан</span><span>Төлөв</span><span>Одоогийн эрх</span><span /></div>
          {members.map((m) => (
            <div className="data-row" key={m.id} style={{ gridTemplateColumns: "minmax(220px,1fr) 130px 160px 220px" }}>
              <span className="row-main">
                <i>{m.user.name.slice(0, 2).toUpperCase()}</i>
                <b>{m.user.name}</b>
                <small>{m.user.email}</small>
              </span>
              <span className={`pill ${m.status === "ACTIVE" ? "ok" : "warn"}`}>{memberStatusLabel[m.status] ?? m.status}</span>
              <span style={{ fontSize: 12, color: "#9aa5b2" }}>{m.roles.length ? m.roles.map((r) => roleLabel[r.role.name] ?? r.role.name).join(", ") : "Оноогоогүй"}</span>
              <SettingsRoleForm memberId={m.id} currentRole={m.roles[0]?.role.name ?? "EMPLOYEE"} />
            </div>
          ))}
          {members.length === 0 && <div className="empty"><p>Гишүүн алга.</p></div>}
        </article>
      </section>
    </main>
  );
}
