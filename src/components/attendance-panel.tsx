"use client";
import { useActionState } from "react";
import { checkIn, checkOut } from "@/lib/actions";

function errorBox(message: string) {
  return <p style={{ background: "#3a1420", border: "1px solid #6b1f34", color: "#ff8a9e", fontSize: 12.5, borderRadius: 8, padding: "10px 13px", marginTop: 10 }}>{message}</p>;
}

export function AttendancePanel({ checkInAt, checkOutAt }: { checkInAt: string | null; checkOutAt: string | null }) {
  const [inError, inAction, inPending] = useActionState(async () => {
    try {
      await checkIn();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);
  const [outError, outAction, outPending] = useActionState(async () => {
    try {
      await checkOut();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);

  return (
    <article className="panel" style={{ padding: 24 }}>
      <h2>Миний өнөөдрийн ирц</h2>
      <div style={{ display: "flex", gap: 32, margin: "16px 0" }}>
        <div><small style={{ color: "#8d99a8" }}>Ирсэн цаг</small><br /><strong style={{ fontSize: 22 }}>{checkInAt ?? "—"}</strong></div>
        <div><small style={{ color: "#8d99a8" }}>Явсан цаг</small><br /><strong style={{ fontSize: 22 }}>{checkOutAt ?? "—"}</strong></div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <form action={inAction}>
          <button disabled={inPending || Boolean(checkInAt)} className="glow-button submit" type="submit" style={{ width: "auto", height: 42, padding: "0 18px", margin: 0 }}>
            {inPending ? "..." : "Ирц бүртгүүлэх"}
          </button>
        </form>
        <form action={outAction}>
          <button disabled={outPending || !checkInAt || Boolean(checkOutAt)} type="submit" style={{ height: 42, padding: "0 18px", borderRadius: 7, border: "1px solid #354554", background: "#081522", color: "#fff" }}>
            {outPending ? "..." : "Явсан бүртгэх"}
          </button>
        </form>
      </div>
      {inError && errorBox(inError)}
      {outError && errorBox(outError)}
    </article>
  );
}
