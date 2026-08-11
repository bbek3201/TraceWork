import { CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getInvitationByToken } from "@/lib/queries";
import { roleLabel } from "@/lib/labels";
import { AcceptInvitationForm, DeclineInvitationButton } from "@/components/settings-panel";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect(`/login?callbackUrl=/invite/${token}`);

  const invitation = await getInvitationByToken(token);

  return (
    <main className="auth-page">
      <section className="auth-brand" />
      <div className="auth-form-wrap">
        <article className="auth-form panel">
          {!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date() ? (
            <>
              <span className="form-icon"><XCircle /></span>
              <h2>Урилга хүчингүй</h2>
              <p>Энэ урилга олдсонгүй, цуцлагдсан, эсвэл хугацаа нь дууссан байна.</p>
              <Link href="/">Нүүр хуудас руу буцах</Link>
            </>
          ) : invitation.email !== session.user.email ? (
            <>
              <span className="form-icon"><XCircle /></span>
              <h2>Энэ урилга танд хамаарахгүй</h2>
              <p>Урилга «{invitation.email}» хаягт илгээгдсэн байна. Та өөр бүртгэлээр нэвтэрсэн байна.</p>
              <Link href="/">Нүүр хуудас руу буцах</Link>
            </>
          ) : (
            <>
              <span className="form-icon"><CheckCircle2 /></span>
              <h2>«{invitation.organization.name}»-д нэгдэх</h2>
              <p>
                Танийг {roleLabel[invitation.role] ?? invitation.role} эрхээр ажилтнаар урьсан байна. Хүлээн авбал
                дараагийн удаа нэвтрэхдээ энэ байгууллагаа сонгож болно.
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <AcceptInvitationForm token={token} />
                <DeclineInvitationButton invitationId={invitation.id} />
              </div>
            </>
          )}
        </article>
      </div>
    </main>
  );
}
