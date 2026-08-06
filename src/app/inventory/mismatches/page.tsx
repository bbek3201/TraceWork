import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { listAllMismatches } from "@/lib/queries";
import { inventoryMismatchSourceLabel, inventoryMismatchStatusLabel, inventoryMismatchTypeLabel } from "@/lib/labels";
import { can, PERMISSIONS, type AppRole } from "@/lib/permissions";
import { ResolveMismatchForm } from "@/components/mismatch-panel";

export default async function InventoryMismatchesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!can(session.user.role as AppRole, PERMISSIONS.inventoryManage)) redirect("/inventory");

  const mismatches = await listAllMismatches(session.user.organizationId);
  const openCount = mismatches.filter((m) => m.status === "OPEN").length;

  return (
    <main className="standalone">
      <header className="module-header">
        <Link href="/inventory" className="back"><ArrowLeft /> Агуулах</Link>
        <div className="module-org"><AlertTriangle /> Барааны зөрүү</div>
      </header>
      <section className="module-content">
        <div className="module-heading">
          <div><h1>Барааны зөрүү</h1><p>Хүлээн авалт, тооллого болон 3 талт тулгалтаас илэрсэн зөрүүнүүд ({openCount} нээлттэй)</p></div>
        </div>
        <article className="panel data-panel">
          <div className="data-head"><span>Бараа / шалтгаан</span><span>Төлөв</span><span>Тоо хэмжээ</span><span /></div>
          {mismatches.map((m) => (
            <div className="data-row" key={m.id} style={{ gridTemplateColumns: "minmax(220px,1fr) 130px 140px 170px" }}>
              <span className="row-main">
                <i><AlertTriangle size={20} /></i>
                <b>{m.product.name} · {inventoryMismatchTypeLabel[m.type] ?? m.type}</b>
                <small>{inventoryMismatchSourceLabel[m.sourceType] ?? m.sourceType} · {m.description ?? "Тайлбаргүй"}</small>
              </span>
              <span className={`pill ${m.status === "OPEN" ? "warn" : "ok"}`}>{inventoryMismatchStatusLabel[m.status] ?? m.status}</span>
              <span style={{ fontSize: 12, color: "#9aa5b2" }}>{m.quantity} {m.product.unit}</span>
              {m.status === "OPEN" ? <ResolveMismatchForm mismatchId={m.id} /> : <span style={{ fontSize: 11, color: "#7f8c9b" }}>{m.resolvedBy?.name}</span>}
            </div>
          ))}
          {mismatches.length === 0 && <div className="empty"><p>Зөрүү бүртгэгдээгүй байна.</p></div>}
        </article>
      </section>
    </main>
  );
}
