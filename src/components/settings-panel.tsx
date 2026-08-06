"use client";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { assignRole, inviteMemberToOrg, updateOrganization } from "@/lib/actions";
import { roleLabel } from "@/lib/labels";

const ASSIGNABLE_ROLES = ["EMPLOYEE", "TEAM_LEAD", "MANAGER", "HR", "EXECUTIVE", "ADMIN"];

function errorBox(message: string) {
  return <p className="form-error" style={{ marginTop: 10 }}>{message}</p>;
}

export function OrgNameForm({ currentName }: { currentName: string }) {
  const [error, formAction, pending] = useActionState(async (_prev: string | null, formData: FormData) => {
    try {
      await updateOrganization(formData);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);

  return (
    <form action={formAction} className="simple-form" style={{ maxWidth: 420 }}>
      <label>
        Байгууллагын нэр
        <input name="name" defaultValue={currentName} required minLength={2} />
      </label>
      <button disabled={pending} className="glow-button submit" type="submit" style={{ width: "auto", height: 42, padding: "0 18px" }}>
        {pending ? "Хадгалж байна..." : "Хадгалах"}
      </button>
      {error && errorBox(error)}
    </form>
  );
}

export function InviteMemberForm() {
  const router = useRouter();
  const [error, formAction, pending] = useActionState(async (_prev: string | null, formData: FormData) => {
    try {
      await inviteMemberToOrg(formData);
      router.refresh();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);

  return (
    <form action={formAction} className="simple-form" style={{ maxWidth: 420 }}>
      <label>
        Урих хэрэглэгчийн и-мэйл
        <input name="email" type="email" required placeholder="name@company.mn" />
      </label>
      <label>
        Албан тушаал
        <input name="jobTitle" placeholder="Заавал биш" />
      </label>
      <p className="muted" style={{ fontSize: 11.5, margin: 0 }}>
        Зөвхөн EVIDO-д өмнө нь бүртгүүлсэн (өөр байгууллагад ч байж болно) хэрэглэгчийг урих боломжтой.
      </p>
      <button disabled={pending} className="glow-button submit" type="submit" style={{ width: "auto", height: 42, padding: "0 18px" }}>
        {pending ? "Урьж байна..." : "Урих"}
      </button>
      {error && errorBox(error)}
    </form>
  );
}

export function SettingsRoleForm({ memberId, currentRole }: { memberId: string; currentRole: string }) {
  const router = useRouter();
  const [error, formAction, pending] = useActionState(async (_prev: string | null, formData: FormData) => {
    formData.set("memberId", memberId);
    try {
      await assignRole(formData);
      router.refresh();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);

  return (
    <form action={formAction} style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select
        name="role"
        defaultValue={currentRole}
        style={{ background: "#0a141f", border: "1px solid #263746", borderRadius: 6, padding: "6px 8px", color: "#fff", fontSize: 12 }}
      >
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r} value={r}>{roleLabel[r] ?? r}</option>
        ))}
      </select>
      <button disabled={pending} type="submit" style={{ height: 30, padding: "0 12px", borderRadius: 6, border: "1px solid #6540a7", background: "none", color: "#aa7dff", fontSize: 12 }}>
        {pending ? "..." : "Хадгалах"}
      </button>
      {error && <span style={{ color: "#ff8a9e", fontSize: 11 }}>{error}</span>}
    </form>
  );
}
