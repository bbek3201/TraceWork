"use client";
import { useActionState } from "react";
import { changeMyPassword, updateMyProfile } from "@/lib/actions";

function errorBox(message: string) {
  return <p className="form-error" style={{ marginTop: 10 }}>{message}</p>;
}

export function ProfileNameForm({ currentName }: { currentName: string }) {
  const [error, formAction, pending] = useActionState(async (_prev: string | null, formData: FormData) => {
    try {
      await updateMyProfile(formData);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);

  return (
    <form action={formAction} className="simple-form" style={{ maxWidth: 420 }}>
      <label>
        Нэр
        <input name="name" defaultValue={currentName} required minLength={2} />
      </label>
      <button disabled={pending} className="glow-button submit" type="submit" style={{ width: "auto" }}>
        {pending ? "Хадгалж байна..." : "Хадгалах"}
      </button>
      {error && errorBox(error)}
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string | null; ok: boolean }, formData: FormData) => {
      try {
        await changeMyPassword(formData);
        return { error: null, ok: true };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Алдаа гарлаа.", ok: false };
      }
    },
    { error: null, ok: false },
  );

  return (
    <form action={formAction} className="simple-form" style={{ maxWidth: 420 }} key={state.ok ? "reset" : "form"}>
      <label>
        Одоогийн нууц үг
        <input name="currentPassword" type="password" required />
      </label>
      <label>
        Шинэ нууц үг
        <input name="newPassword" type="password" required minLength={8} />
      </label>
      <label>
        Шинэ нууц үг давтах
        <input name="confirmPassword" type="password" required minLength={8} />
      </label>
      <button disabled={pending} className="glow-button submit" type="submit" style={{ width: "auto" }}>
        {pending ? "Хадгалж байна..." : "Нууц үг солих"}
      </button>
      {state.error && errorBox(state.error)}
      {state.ok && <p className="muted" style={{ marginTop: 10, color: "#55d177" }}>Нууц үг амжилттай солигдлоо.</p>}
    </form>
  );
}
