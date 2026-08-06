import { ArrowLeft, Boxes, Plus } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { listPurchaseOrders } from "@/lib/queries";
import { purchaseOrderStatusLabel } from "@/lib/labels";
import { can, PERMISSIONS, type AppRole } from "@/lib/permissions";

export default async function PurchaseOrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const canManage = can(session.user.role as AppRole, PERMISSIONS.inventoryManage);
  const orders = await listPurchaseOrders(session.user.organizationId);

  return (
    <main className="standalone">
      <header className="module-header">
        <Link href="/inventory" className="back"><ArrowLeft /> Агуулах</Link>
        <div className="module-org"><Boxes /> Худалдан авалтын захиалга</div>
      </header>
      <section className="module-content">
        <div className="module-heading">
          <div><h1>Захиалгууд</h1><p>Худалдан авалтын захиалга, хүлээн авалтыг удирдах</p></div>
          {canManage && (
            <Link href="/inventory/orders/new" className="glow-button new-action" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", height: 42, padding: "0 16px", borderRadius: 7 }}>
              <Plus size={18} /> Шинэ захиалга
            </Link>
          )}
        </div>
        <article className="panel data-panel">
          <div className="data-head"><span>Захиалга</span><span>Төлөв</span><span>Нийлүүлэгч</span><span /></div>
          {orders.map((o) => (
            <Link href={`/inventory/orders/${o.id}`} className="data-row" key={o.id}>
              <span className="row-main">
                <i><Boxes size={20} /></i>
                <b>{o.poNumber}</b>
                <small>{o.items.length} бараа · {o.receipts.length} хүлээн авалт</small>
              </span>
              <span className={`pill ${o.status === "OPEN" ? "warn" : "ok"}`}>{purchaseOrderStatusLabel[o.status] ?? o.status}</span>
              <span style={{ fontSize: 12, color: "#9aa5b2" }}>{o.supplierName}</span>
              <span />
            </Link>
          ))}
          {orders.length === 0 && <div className="empty"><p>Одоогоор захиалга алга.</p></div>}
        </article>
      </section>
    </main>
  );
}
