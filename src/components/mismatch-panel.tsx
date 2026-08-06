"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveMismatch } from "@/lib/actions";

export function ResolveMismatchForm({ mismatchId }: { mismatchId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, formAction, pending] = useActionState(async (_prev: string | null, formData: FormData) => {
    formData.set("mismatchId", mismatchId);
    try {
      await resolveMismatch(formData);
      router.refresh();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={{ height: 30, padding: "0 12px", borderRadius: 6, border: "1px solid #285c35", background: "#11331b", color: "#55d177", fontSize: 12 }}>
        Шийдвэрлэх
      </button>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <input name="resolvedNote" type="text" placeholder="Тэмдэглэл" style={{ background: "#0a141f", border: "1px solid #263746", borderRadius: 6, padding: "6px 8px", color: "#fff", fontSize: 12, minWidth: 140 }} />
      <button disabled={pending} type="submit" style={{ height: 30, padding: "0 12px", borderRadius: 6, border: "1px solid #285c35", background: "#11331b", color: "#55d177", fontSize: 12 }}>
        {pending ? "..." : "Батлах"}
      </button>
      {error && <span style={{ color: "#ff8a9e", fontSize: 11 }}>{error}</span>}
    </form>
  );
}
