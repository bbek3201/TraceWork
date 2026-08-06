import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Boxes } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { can, PERMISSIONS, type AppRole } from "@/lib/permissions";
import { createProduct } from "@/lib/actions";

export default async function NewProductPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (!can(session.user.role as AppRole, PERMISSIONS.inventoryManage)) redirect("/inventory");

  return (
    <main className="standalone">
      <header className="module-header">
        <Link href="/inventory" className="back"><ArrowLeft /> Агуулах</Link>
        <div className="module-org"><Boxes /> Шинэ бараа</div>
      </header>
      <section className="module-content">
        <div className="module-heading">
          <div><h1>Шинэ бараа бүртгэх</h1><p>Барааны үндсэн мэдээлэл, эхний үлдэгдлийг оруулна уу</p></div>
        </div>
        <article className="panel" style={{ padding: 26 }}>
          <form action={createProduct} className="simple-form">
            <label>Барааны нэр<input name="name" required minLength={2} placeholder="Арматур Ø16" /></label>
            <label>SKU<input name="sku" required placeholder="MAT-0001" /></label>
            <label>Barcode<input name="barcode" placeholder="Заавал биш" /></label>
            <label>Нэгж<input name="unit" defaultValue="ш" required /></label>
            <label>Захиалах доод хэмжээ<input name="reorderPoint" type="number" min={0} defaultValue={10} /></label>
            <label>Эхний үлдэгдэл<input name="openingQuantity" type="number" min={0} defaultValue={0} /></label>
            <button className="glow-button submit" type="submit">Бараа бүртгэх</button>
          </form>
        </article>
      </section>
    </main>
  );
}
