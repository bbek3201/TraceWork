"use client";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { receiveGoods } from "@/lib/actions";

type ReceiveItem = { id: string; productName: string; expectedQuantity: number; unit: string };

function errorBox(message: string) {
  return <p style={{ background: "#3a1420", border: "1px solid #6b1f34", color: "#ff8a9e", fontSize: 12.5, borderRadius: 8, padding: "10px 13px", marginTop: 10 }}>{message}</p>;
}

export function ReceiveGoodsForm({ purchaseOrderId, items }: { purchaseOrderId: string; items: ReceiveItem[] }) {
  const router = useRouter();
  const [error, formAction, pending] = useActionState(async (_prev: string | null, formData: FormData) => {
    formData.set("purchaseOrderId", purchaseOrderId);
    try {
      await receiveGoods(formData);
      router.refresh();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);

  const cellStyle = { background: "#0a141f", border: "1px solid #263746", borderRadius: 6, padding: "8px 10px", color: "#fff", width: "100%" };

  return (
    <form action={formAction} style={{ marginTop: 10 }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ color: "#7f8c9b", textAlign: "left" }}>
              <th style={{ padding: "6px 8px" }}>Бараа</th>
              <th style={{ padding: "6px 8px" }}>Хүлээн авсан</th>
              <th style={{ padding: "6px 8px" }}>Гэмтэлтэй</th>
              <th style={{ padding: "6px 8px" }}>Дутуу</th>
              <th style={{ padding: "6px 8px" }}>Илүү</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td style={{ padding: "6px 8px" }}>
                  <input type="hidden" name="purchaseOrderItemId" value={item.id} />
                  <b>{item.productName}</b><br />
                  <small style={{ color: "#7f8c9b" }}>Захиалсан: {item.expectedQuantity} {item.unit}</small>
                </td>
                <td style={{ padding: "6px 8px" }}><input name="receivedQuantity" type="number" min={0} defaultValue={item.expectedQuantity} style={cellStyle} /></td>
                <td style={{ padding: "6px 8px" }}><input name="damagedQuantity" type="number" min={0} defaultValue={0} style={cellStyle} /></td>
                <td style={{ padding: "6px 8px" }}><input name="missingQuantity" type="number" min={0} defaultValue={0} style={cellStyle} /></td>
                <td style={{ padding: "6px 8px" }}><input name="extraQuantity" type="number" min={0} defaultValue={0} style={cellStyle} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <label style={{ display: "block", fontSize: 12, color: "#c8d0da", marginTop: 12 }}>
        Тэмдэглэл
        <textarea name="note" rows={2} placeholder="Заавал биш" style={{ width: "100%", marginTop: 5, background: "#0a141f", border: "1px solid #263746", borderRadius: 8, padding: "10px 12px", color: "#fff", font: "inherit", resize: "vertical" }} />
      </label>
      <button disabled={pending} className="glow-button submit" type="submit" style={{ width: "auto", height: 42, padding: "0 18px", marginTop: 12 }}>
        {pending ? "Бүртгэж байна..." : "Хүлээн авалт бүртгэх"}
      </button>
      {error && errorBox(error)}
    </form>
  );
}
