import { ArrowLeft, LifeBuoy } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-brand">
        <div className="auth-logo">EVI<b>DO</b></div>
        <div>
          <h1>Нууц үг сэргээх<br /><em>тун удахгүй</em>.</h1>
          <p>Нууц үг сэргээх урсгал одоогоор хөгжүүлэгдэж байна. Тусламж хэрэгтэй бол системийн админтайгаа холбогдоно уу.</p>
        </div>
      </section>
      <section className="auth-form-wrap">
        <form className="auth-form panel">
          <span className="form-icon"><LifeBuoy /></span>
          <h2>Нууц үг сэргээх</h2>
          <p>Энэ боломж удахгүй нэмэгдэнэ. Одоогоор админтайгаа холбогдож нууц үгээ шинэчлүүлнэ үү.</p>
          <Link href="/login" className="glow-button submit" style={{ marginTop: 22, textDecoration: "none" }}>
            <ArrowLeft size={17} /> Нэвтрэх хуудас руу буцах
          </Link>
        </form>
      </section>
    </main>
  );
}
