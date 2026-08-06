"use client";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { recordInventoryCount } from "@/lib/actions";

type CountRow = { id: string; name: string; sku: string; unit: string; systemQuantity: number };

function errorBox(message: string) {
  return <p style={{ background: "#3a1420", border: "1px solid #6b1f34", color: "#ff8a9e", fontSize: 12.5, borderRadius: 8, padding: "10px 13px", marginTop: 10 }}>{message}</p>;
}

export function InventoryCountForm({ rows }: { rows: CountRow[] }) {
  const router = useRouter();
  const [error, formAction, pending] = useActionState(async (_prev: string | null, formData: FormData) => {
    try {
      await recordInventoryCount(formData);
      router.push("/inventory/mismatches");
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);

  const cellStyle = { background: "#0a141f", border: "1px solid #263746", borderRadius: 6, padding: "8px 10px", color: "#fff", width: 120 };

  return (
    <form action={formAction}>
      <label style={{ display: "block", fontSize: 12, color: "#c8d0da", marginBottom: 12 }}>
        Байршил (заавал биш)
        <input name="location" placeholder="Жишээ: Төв агуулах, A хэсэг" style={{ display: "block", width: "100%", marginTop: 5, background: "#0a141f", border: "1px solid #263746", borderRadius: 8, padding: "10px 12px", color: "#fff" }} />
      </label>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ color: "#7f8c9b", textAlign: "left" }}>
              <th style={{ padding: "6px 8px" }}>Бараа</th>
              <th style={{ padding: "6px 8px" }}>Системийн үлдэгдэл</th>
              <th style={{ padding: "6px 8px" }}>Тоолсон үлдэгдэл</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: "6px 8px" }}>
                  <input type="hidden" name="productId" value={row.id} />
                  <b>{row.name}</b><br /><small style={{ color: "#7f8c9b" }}>{row.sku}</small>
                </td>
                <td style={{ padding: "6px 8px", color: "#9aa5b2" }}>{row.systemQuantity} {row.unit}</td>
                <td style={{ padding: "6px 8px" }}><input name="countedQuantity" type="number" min={0} placeholder="—" style={cellStyle} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button disabled={pending} className="glow-button submit" type="submit" style={{ width: "auto", height: 42, padding: "0 18px", marginTop: 16 }}>
        {pending ? "Бүртгэж байна..." : "Тооллого бүртгэх"}
      </button>
      {error && errorBox(error)}
    </form>
  );
}
