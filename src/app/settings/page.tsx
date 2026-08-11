import { ArrowLeft, Building2, KeyRound, Settings, UserPlus } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getOrganization, listOrgMembersWithRoles, listPendingInvitations } from "@/lib/queries";
import { memberStatusLabel, roleLabel } from "@/lib/labels";
import { can, PERMISSIONS, type AppRole } from "@/lib/permissions";
import { InviteCodeCard, InviteMemberForm, OrgNameForm, RevokeInvitationButton, SettingsRoleForm } from "@/components/settings-panel";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!can(session.user.role as AppRole, PERMISSIONS.settingsManage)) redirect("/");

  const [organization, members, pendingInvitations] = await Promise.all([
    getOrganization(session.user.organizationId),
    listOrgMembersWithRoles(session.user.organizationId),
    listPendingInvitations(session.user.organizationId),
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
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><KeyRound size={18} /> Компанийн код</h2>
          <InviteCodeCard inviteCode={organization.inviteCode} />
        </article>

        <article className="panel" style={{ padding: 24, marginBottom: 16 }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><UserPlus size={18} /> Гишүүн урих</h2>
          <InviteMemberForm />
        </article>

        {pendingInvitations.length > 0 && (
          <article className="panel" style={{ padding: 24, marginBottom: 16 }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><UserPlus size={18} /> Хүлээгдэж буй урилга ({pendingInvitations.length})</h2>
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {pendingInvitations.map((inv) => {
                const isExpired = inv.expiresAt < new Date();
                return (
                  <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", border: "1px solid #1d2d3a", borderRadius: 7 }}>
                    <span style={{ fontSize: 12.5 }}>
                      {inv.email} <span className="muted">— {roleLabel[inv.role] ?? inv.role}</span>
                      {isExpired && <span className="pill warn" style={{ marginLeft: 8, fontSize: 10.5 }}>Хугацаа дууссан</span>}
                    </span>
                    <RevokeInvitationButton invitationId={inv.id} />
                  </div>
                );
              })}
            </div>
          </article>
        )}

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
              {m.id === session.user.memberId ? (
                <span className="muted" style={{ fontSize: 11.5 }}>Өөрийн эрхээ энд өөрчлөх боломжгүй</span>
              ) : (
                <SettingsRoleForm memberId={m.id} currentRole={m.roles[0]?.role.name ?? "EMPLOYEE"} />
              )}
            </div>
          ))}
          {members.length === 0 && <div className="empty"><p>Гишүүн алга.</p></div>}
        </article>
      </section>
    </main>
  );
}
