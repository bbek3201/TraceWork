"use client";
import { Copy, RefreshCw } from "lucide-react";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitation, assignRole, inviteMemberToOrg, regenerateInviteCode, revokeInvitation, updateOrganization } from "@/lib/actions";
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

export function InviteCodeCard({ inviteCode }: { inviteCode: string }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [, formAction, pending] = useActionState(async () => {
    try {
      await regenerateInviteCode();
      router.refresh();
    } catch {
      // regenerateInviteCode only fails on a permission check already enforced by the page gate
    }
    return null;
  }, null);

  const url = typeof window !== "undefined" ? `${window.location.origin}/register?code=${inviteCode}` : `/register?code=${inviteCode}`;

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <p className="muted" style={{ fontSize: 12, margin: "0 0 10px" }}>
        Энэ линкийг илгээсэн хэн ч Ажилтны эрхээр таны байгууллагад шууд бүртгүүлж нэгдэх боломжтой.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <input readOnly value={url} style={{ flex: 1, background: "#0a141f", border: "1px solid #263746", borderRadius: 8, padding: "10px 12px", color: "#c8d0da", fontSize: 12.5 }} />
        <button type="button" onClick={copy} style={{ height: 40, padding: "0 14px", borderRadius: 7, border: "1px solid #354554", background: "#081522", color: "#dce4ec", display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
          <Copy size={14} /> {copied ? "Хууллаа" : "Хуулах"}
        </button>
        <form action={formAction}>
          <button disabled={pending} type="submit" style={{ height: 40, padding: "0 14px", borderRadius: 7, border: "1px solid #354554", background: "#081522", color: "#dce4ec", display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
            <RefreshCw size={14} /> Шинэ код
          </button>
        </form>
      </div>
    </div>
  );
}

export function InviteMemberForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string | null; inviteUrl: string | null }, formData: FormData) => {
      try {
        const result = await inviteMemberToOrg(formData);
        router.refresh();
        return { error: null, inviteUrl: result.inviteUrl };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Алдаа гарлаа.", inviteUrl: null };
      }
    },
    { error: null, inviteUrl: null },
  );

  const fullInviteUrl = state.inviteUrl && typeof window !== "undefined" ? `${window.location.origin}${state.inviteUrl}` : state.inviteUrl;

  return (
    <form action={formAction} className="simple-form" style={{ maxWidth: 420 }} key={state.inviteUrl ?? "form"}>
      <label>
        Урих хэрэглэгчийн и-мэйл
        <input name="email" type="email" required placeholder="name@company.mn" />
      </label>
      <label>
        Албан тушаал
        <input name="jobTitle" placeholder="Заавал биш" />
      </label>
      <label>
        Эрх
        <select name="role" defaultValue="EMPLOYEE">
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r} value={r}>{roleLabel[r] ?? r}</option>
          ))}
        </select>
      </label>
      <p className="muted" style={{ fontSize: 11.5, margin: 0 }}>
        Хэрэв тухайн и-мэйлээр EVIDO-д бүртгэлтэй хэрэглэгч байвал шууд нэмэгдэнэ. Үгүй бол урилгын линк үүсгэнэ — линкийг тухайн хүнд илгээнэ үү.
      </p>
      <button disabled={pending} className="glow-button submit" type="submit" style={{ width: "auto", height: 42, padding: "0 18px" }}>
        {pending ? "Урьж байна..." : "Урих"}
      </button>
      {state.error && errorBox(state.error)}
      {fullInviteUrl && (
        <p style={{ fontSize: 12, color: "#55d177", background: "#11331b", border: "1px solid #285c35", borderRadius: 8, padding: "10px 13px", wordBreak: "break-all" }}>
          Урилгын линк үүслээ: {fullInviteUrl}
        </p>
      )}
    </form>
  );
}

export function RevokeInvitationButton({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [error, formAction, pending] = useActionState(async (_prev: string | null, formData: FormData) => {
    try {
      await revokeInvitation(formData);
      router.refresh();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);

  return (
    <form action={formAction} style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input type="hidden" name="invitationId" value={invitationId} />
      <button disabled={pending} type="submit" style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "1px solid #6b1f34", background: "none", color: "#ff8a9e", fontSize: 11 }}>
        {pending ? "..." : "Цуцлах"}
      </button>
      {error && <span style={{ color: "#ff8a9e", fontSize: 11 }}>{error}</span>}
    </form>
  );
}

export function AcceptInvitationForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, formAction, pending] = useActionState(async (_prev: string | null, formData: FormData) => {
    try {
      await acceptInvitation(formData);
      router.push("/login");
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />
      <button disabled={pending} className="glow-button submit" type="submit" style={{ width: "auto", height: 42, padding: "0 18px" }}>
        {pending ? "Нэгдэж байна..." : "Хүлээн авах"}
      </button>
      {error && errorBox(error)}
    </form>
  );
}

export function DeclineInvitationButton({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [error, formAction, pending] = useActionState(async (_prev: string | null, formData: FormData) => {
    try {
      await revokeInvitation(formData);
      router.push("/");
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="invitationId" value={invitationId} />
      <button disabled={pending} type="submit" style={{ height: 42, padding: "0 18px", borderRadius: 8, border: "1px solid #354554", background: "none", color: "#9aa5b2", fontSize: 13 }}>
        {pending ? "..." : "Татгалзах"}
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
