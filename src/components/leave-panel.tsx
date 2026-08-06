"use client";
import { useActionState } from "react";
import { requestLeave, reviewLeave } from "@/lib/actions";

function errorBox(message: string) {
  return <p style={{ background: "#3a1420", border: "1px solid #6b1f34", color: "#ff8a9e", fontSize: 12.5, borderRadius: 8, padding: "10px 13px", marginTop: 10 }}>{message}</p>;
}

export function LeaveRequestForm() {
  const [error, formAction, pending] = useActionState(async (_prev: string | null, formData: FormData) => {
    try {
      await requestLeave(formData);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);

  return (
    <form action={formAction} className="simple-form" style={{ maxWidth: 480 }}>
      <label>
        Чөлөөний төрөл
        <select name="leaveType" defaultValue="ANNUAL">
          <option value="ANNUAL">Ээлжийн амралт</option>
          <option value="SICK">Өвчний чөлөө</option>
          <option value="UNPAID">Цалингүй чөлөө</option>
          <option value="OTHER">Бусад</option>
        </select>
      </label>
      <label>Эхлэх огноо<input name="startDate" type="date" required /></label>
      <label>Дуусах огноо<input name="endDate" type="date" required /></label>
      <label>Шалтгаан<textarea name="reason" rows={3} placeholder="Товч тайлбар (заавал биш)" /></label>
      <button disabled={pending} className="glow-button submit" type="submit" style={{ width: "auto", height: 44, padding: "0 18px" }}>
        {pending ? "Илгээж байна..." : "Хүсэлт илгээх"}
      </button>
      {error && errorBox(error)}
    </form>
  );
}

export function LeaveReviewActions({ leaveId }: { leaveId: string }) {
  const [error, formAction, pending] = useActionState(async (_prev: string | null, formData: FormData) => {
    try {
      await reviewLeave(formData);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);

  return (
    <div>
      <form action={formAction} style={{ display: "flex", gap: 8 }}>
        <input type="hidden" name="leaveId" value={leaveId} />
        <button disabled={pending} name="decision" value="APPROVED" type="submit" style={{ height: 32, padding: "0 12px", borderRadius: 6, border: "1px solid #285c35", background: "#11331b", color: "#55d177", fontSize: 12 }}>
          Зөвшөөрөх
        </button>
        <button disabled={pending} name="decision" value="REJECTED" type="submit" style={{ height: 32, padding: "0 12px", borderRadius: 6, border: "1px solid #92323a", background: "#40151a", color: "#ff6670", fontSize: 12 }}>
          Татгалзах
        </button>
      </form>
      {error && errorBox(error)}
    </div>
  );
}
