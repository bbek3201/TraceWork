import { ArrowLeft, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { computeStockOnHand, listProductRows } from "@/lib/queries";
import { can, PERMISSIONS, type AppRole } from "@/lib/permissions";
import { InventoryCountForm } from "@/components/inventory-count-form";

export default async function NewInventoryCountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!can(session.user.role as AppRole, PERMISSIONS.inventoryManage)) redirect("/inventory");

  const products = await listProductRows(session.user.organizationId);
  const rows = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    unit: p.unit,
    systemQuantity: computeStockOnHand(p.movements),
  }));

  return (
    <main className="standalone">
      <header className="module-header">
        <Link href="/inventory" className="back"><ArrowLeft /> Агуулах</Link>
        <div className="module-org"><ClipboardCheck /> Тооллого</div>
      </header>
      <section className="module-content">
        <div className="module-heading">
          <div><h1>Барааны тооллого</h1><p>Бодит тоолсон үлдэгдлээ оруулна уу — систем зөрүүг автоматаар илрүүлж, тохируулна</p></div>
        </div>
        <article className="panel" style={{ padding: 26 }}>
          {rows.length === 0 ? (
            <p className="muted">Одоогоор бүртгэлтэй бараа алга.</p>
          ) : (
            <InventoryCountForm rows={rows} />
          )}
        </article>
      </section>
    </main>
  );
}
