import { ArrowLeft, Boxes, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getPurchaseOrderDetail } from "@/lib/queries";
import { purchaseOrderStatusLabel } from "@/lib/labels";
import { can, PERMISSIONS, type AppRole } from "@/lib/permissions";
import { ReceiveGoodsForm } from "@/components/receive-goods-form";

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const po = await getPurchaseOrderDetail(id, session.user.organizationId);
  if (!po) notFound();

  const canManage = can(session.user.role as AppRole, PERMISSIONS.inventoryManage);
  const receiveItems = po.items.map((item) => ({
    id: item.id,
    productName: item.product.name,
    expectedQuantity: item.expectedQuantity,
    unit: item.product.unit,
  }));

  return (
    <main className="standalone">
      <header className="module-header">
        <Link href="/inventory/orders" className="back"><ArrowLeft /> Захиалгууд</Link>
        <div className="module-org"><Boxes /> {po.poNumber}</div>
      </header>
      <section className="detail-content">
        <div className="detail-title">
          <span className={`pill ${po.status === "OPEN" ? "warn" : "ok"}`}>{purchaseOrderStatusLabel[po.status] ?? po.status}</span>
          <h1>{po.poNumber}</h1>
          <p>{po.supplierName}{po.invoiceNumber ? ` · Нэхэмжлэх ${po.invoiceNumber}` : ""}</p>
        </div>
        <div className="detail-grid">
          <article className="panel detail-main">
            <h2>Захиалсан бараа</h2>
            {po.items.map((item) => (
              <div className="evidence" key={item.id}>
                <span className="complete"><Boxes size={18} /></span>
                <div>
                  <b>{item.product.name}</b>
                  <small>Захиалсан {item.expectedQuantity} {item.product.unit}{item.invoiceQuantity != null ? ` · Нэхэмжлэх ${item.invoiceQuantity} ${item.product.unit}` : ""}</small>
                </div>
              </div>
            ))}

            {canManage && po.status !== "CLOSED" && (
              <>
                <h2 style={{ marginTop: 24 }}>Хүлээн авах</h2>
                <ReceiveGoodsForm purchaseOrderId={po.id} items={receiveItems} />
              </>
            )}

            {po.receipts.length > 0 && (
              <>
                <h2 style={{ marginTop: 24 }}>Хүлээн авалтын түүх</h2>
                {po.receipts.map((r) => (
                  <div key={r.id} style={{ border: "1px solid #233441", borderRadius: 8, padding: "10px 13px", margin: "8px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <CheckCircle2 size={16} color="#55d177" />
                      <b style={{ fontSize: 12.5 }}>{r.receivedBy.name} · {r.createdAt.toLocaleString("mn-MN")}</b>
                    </div>
                    {r.items.map((it) => (
                      <div key={it.id} style={{ fontSize: 12, color: "#9aa5b2", marginLeft: 26 }}>
                        {it.product.name}: хүлээн авсан {it.receivedQuantity}, гэмтэлтэй {it.damagedQuantity}, дутуу {it.missingQuantity}, илүү {it.extraQuantity}
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </article>
          <aside className="panel detail-side">
            <h2>Мэдээлэл</h2>
            <dl>
              <dt>Нийлүүлэгч</dt><dd>{po.supplierName}</dd>
              <dt>Нэхэмжлэх</dt><dd>{po.invoiceNumber ?? "—"}</dd>
              <dt>Үүсгэсэн</dt><dd>{po.createdBy.name}</dd>
              <dt>Огноо</dt><dd>{po.createdAt.toLocaleDateString("mn-MN")}</dd>
            </dl>
          </aside>
        </div>
      </section>
    </main>
  );
}
