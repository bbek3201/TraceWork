import { ArrowLeft, Boxes } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { listProductRows } from "@/lib/queries";
import { can, PERMISSIONS, type AppRole } from "@/lib/permissions";
import { createPurchaseOrder } from "@/lib/actions";

const ROW_COUNT = 6;

export default async function NewPurchaseOrderPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!can(session.user.role as AppRole, PERMISSIONS.inventoryManage)) redirect("/inventory/orders");

  const products = await listProductRows(session.user.organizationId);

  return (
    <main className="standalone">
      <header className="module-header">
        <Link href="/inventory/orders" className="back"><ArrowLeft /> Захиалгууд</Link>
        <div className="module-org"><Boxes /> Шинэ захиалга</div>
      </header>
      <section className="module-content">
        <div className="module-heading">
          <div><h1>Худалдан авалтын шинэ захиалга</h1><p>Нийлүүлэгч, нэхэмжлэх болон захиалсан барааны мэдээллийг оруулна уу</p></div>
        </div>
        <article className="panel" style={{ padding: 26 }}>
          {products.length === 0 ? (
            <p className="muted">Эхлээд <Link href="/inventory/new">бараа бүртгэх</Link> шаардлагатай.</p>
          ) : (
            <form action={createPurchaseOrder} className="simple-form">
              <label>PO дугаар<input name="poNumber" required placeholder="PO-1001" /></label>
              <label>Нийлүүлэгч<input name="supplierName" required placeholder="ХХК" /></label>
              <label>Нэхэмжлэхийн дугаар<input name="invoiceNumber" placeholder="Заавал биш" /></label>

              <div style={{ marginTop: 6 }}>
                <b style={{ fontSize: 12, color: "#c8d0da" }}>Захиалсан бараа</b>
                <p className="muted" style={{ fontSize: 11.5, margin: "4px 0 10px" }}>
                  Хэрэв нэхэмжлэхийн тоо ширхэг захиалсан тооноос ялгаатай бол доор бөглөнө үү — хүлээн авахдаа 3 талт тулгалт хийхэд ашиглагдана.
                </p>
                {Array.from({ length: ROW_COUNT }).map((_, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <select name="productId" defaultValue="" style={{ flex: 2, minWidth: 160, background: "#0a141f", border: "1px solid #263746", borderRadius: 8, padding: "10px 12px", color: "#fff" }}>
                      <option value="">Сонгоогүй</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                    <input name="expectedQuantity" type="number" min={0} placeholder="Захиалсан тоо" style={{ flex: 1, minWidth: 100, background: "#0a141f", border: "1px solid #263746", borderRadius: 8, padding: "10px 12px", color: "#fff" }} />
                    <input name="invoiceQuantity" type="number" min={0} placeholder="Нэхэмжлэх тоо (заавал биш)" style={{ flex: 1, minWidth: 140, background: "#0a141f", border: "1px solid #263746", borderRadius: 8, padding: "10px 12px", color: "#fff" }} />
                  </div>
                ))}
              </div>

              <button className="glow-button submit" type="submit">Захиалга үүсгэх</button>
            </form>
          )}
        </article>
      </section>
    </main>
  );
}
