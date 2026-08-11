"use client";
import { ArrowRight, Building2, CheckCircle2, ChevronLeft, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck, User } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type OrgChoice = { id: string; name: string };
type InviteInfo = { email: string; organizationName: string };

// Admins share the join code as a full URL ("…/register?code=xxx"), and people
// often paste the whole thing into the code field instead of just the code —
// so accept either and pull the bare code out.
function extractJoinCode(value: string) {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    return url.searchParams.get("code") ?? trimmed;
  } catch {
    return trimmed;
  }
}

export function AuthScreen({ mode = "login" }: { mode?: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = mode === "register" ? searchParams.get("invite") : null;
  const prefillCode = mode === "register" ? searchParams.get("code") : null;

  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgChoices, setOrgChoices] = useState<OrgChoice[] | null>(null);
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);
  const [joinMode, setJoinMode] = useState<"create" | "code">(prefillCode ? "code" : "create");
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(Boolean(inviteToken));

  useEffect(() => {
    if (!inviteToken) return;
    fetch(`/api/auth/invitations/${inviteToken}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setInviteError(data.error ?? "Урилга олдсонгүй.");
          return;
        }
        setInviteInfo(data);
      })
      .catch(() => setInviteError("Урилгын мэдээллийг ачаалж чадсангүй."))
      .finally(() => setInviteLoading(false));
  }, [inviteToken]);

  async function completeSignIn(email: string, password: string, organizationId: string) {
    const result = await signIn("credentials", { email, password, organizationId, redirect: false });
    if (result?.error) {
      setError("И-мэйл эсвэл нууц үг буруу байна.");
      setPending(false);
      return;
    }
    router.push(searchParams.get("callbackUrl") || "/");
    router.refresh();
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = inviteInfo ? inviteInfo.email : String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      if (mode === "register") {
        const name = String(form.get("name") ?? "");
        const body: Record<string, string> = { name, email, password };
        if (inviteToken) {
          body.inviteToken = inviteToken;
        } else if (joinMode === "code") {
          body.joinCode = extractJoinCode(String(form.get("joinCode") ?? ""));
        } else {
          body.organizationName = String(form.get("organizationName") ?? "");
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Бүртгэл амжилтгүй боллоо.");
          setPending(false);
          return;
        }
        // A brand-new registration always resolves to exactly one membership — no company picker needed.
        await completeSignIn(email, password, "");
        return;
      }

      // Login: resolve which organization(s) this account can sign into before
      // asking NextAuth to establish the session (FR-01 "company select on login").
      const res = await fetch("/api/auth/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "И-мэйл эсвэл нууц үг буруу байна.");
        setPending(false);
        return;
      }

      const organizations: OrgChoice[] = data.organizations;
      if (organizations.length === 1) {
        await completeSignIn(email, password, organizations[0].id);
        return;
      }

      setPendingCredentials({ email, password });
      setOrgChoices(organizations);
      setPending(false);
    } catch {
      setError("Алдаа гарлаа. Дахин оролдоно уу.");
      setPending(false);
    }
  }

  async function chooseOrganization(organizationId: string) {
    if (!pendingCredentials) return;
    setError(null);
    setPending(true);
    try {
      await completeSignIn(pendingCredentials.email, pendingCredentials.password, organizationId);
    } catch {
      setError("Алдаа гарлаа. Дахин оролдоно уу.");
      setPending(false);
    }
  }

  const inviteBlocked = Boolean(inviteToken) && (inviteLoading || Boolean(inviteError));

  return (
    <main className="auth-page">
      <section className="auth-brand">
        <div className="auth-logo">EVI<b>DO</b></div>
        <div>
          <span className="auth-kicker"><ShieldCheck size={18} /> Ажил бүр баталгаатай</span>
          <h1>Ажлын үр дүнг<br /><em>нотолгоогоор</em> удирд.</h1>
          <p>Төсөл, даалгавар, ажилтан, ирц, бараа материалын бүх үйл ажиллагааг нэг системээс.</p>
        </div>
        <ul>
          <li><CheckCircle2 /> Нотолгоонд суурилсан гүйцэтгэл</li>
          <li><CheckCircle2 /> Олон шатлалт баталгаажуулалт</li>
          <li><CheckCircle2 /> Бодит цагийн тайлан, эрсдэлийн хяналт</li>
        </ul>
      </section>
      <section className="auth-form-wrap">
        {orgChoices ? (
          <div className="auth-form panel">
            <span className="form-icon"><Building2 /></span>
            <h2>Байгууллага сонгох</h2>
            <p>Та хэд хэдэн байгууллагын гишүүн байна. Аль руу нэвтрэхээ сонгоно уу.</p>
            <div style={{ display: "grid", gap: 10, margin: "18px 0" }}>
              {orgChoices.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  disabled={pending}
                  onClick={() => chooseOrganization(org.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, height: 52, borderRadius: 8, border: "1px solid #263746", background: "#0a141f", color: "#fff", padding: "0 16px", fontSize: 14, textAlign: "left" }}
                >
                  <Building2 size={18} color="#9d70ff" />
                  {org.name}
                </button>
              ))}
            </div>
            {error && <p className="form-error">{error}</p>}
            <button
              type="button"
              onClick={() => { setOrgChoices(null); setPendingCredentials(null); setError(null); }}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: 0, color: "#8592a2", fontSize: 12.5, padding: 0 }}
            >
              <ChevronLeft size={15} /> Буцах
            </button>
          </div>
        ) : (
          <form className="auth-form panel" onSubmit={submit}>
            <span className="form-icon"><Building2 /></span>
            <h2>
              {mode === "login"
                ? "Тавтай морилно уу"
                : inviteInfo
                  ? `«${inviteInfo.organizationName}»-д нэгдэх`
                  : "Байгууллага үүсгэх"}
            </h2>
            <p>
              {mode === "login"
                ? "Байгууллагын бүртгэлээрээ нэвтэрнэ үү"
                : inviteInfo
                  ? "Танийг энэ байгууллагад ажилтнаар урьсан байна"
                  : "EVIDO-г ашиглаж эхлэхэд нэг алхам үлдлээ"}
            </p>

            {mode === "register" && inviteToken && inviteLoading && (
              <p className="muted" style={{ marginTop: 14 }}>Урилгын мэдээллийг шалгаж байна...</p>
            )}
            {mode === "register" && inviteError && (
              <p className="form-error" style={{ marginTop: 14 }}>
                {inviteError} <Link href="/register">Шинэ байгууллага үүсгэх үү?</Link>
              </p>
            )}

            {mode === "register" && !inviteBlocked && (
              <>
                {!inviteToken && (
                  <div style={{ display: "flex", gap: 8, margin: "14px 0 4px" }}>
                    <button
                      type="button"
                      onClick={() => setJoinMode("create")}
                      style={{ flex: 1, height: 38, borderRadius: 7, fontSize: 12.5, border: joinMode === "create" ? "1px solid #9774ff" : "1px solid #263746", background: joinMode === "create" ? "#241a45" : "transparent", color: joinMode === "create" ? "#fff" : "#8592a2" }}
                    >
                      Шинэ байгууллага
                    </button>
                    <button
                      type="button"
                      onClick={() => setJoinMode("code")}
                      style={{ flex: 1, height: 38, borderRadius: 7, fontSize: 12.5, border: joinMode === "code" ? "1px solid #9774ff" : "1px solid #263746", background: joinMode === "code" ? "#241a45" : "transparent", color: joinMode === "code" ? "#fff" : "#8592a2" }}
                    >
                      Компанийн кодоор нэгдэх
                    </button>
                  </div>
                )}

                <label>
                  Таны нэр
                  <div><User /><input name="name" required minLength={2} placeholder="Бат-Эрдэнэ" /></div>
                </label>

                {inviteToken ? null : joinMode === "code" ? (
                  <label>
                    Байгууллагын код
                    <div><KeyRound /><input name="joinCode" required minLength={4} defaultValue={prefillCode ?? ""} placeholder="Админаас авсан код" /></div>
                  </label>
                ) : (
                  <label>
                    Байгууллагын нэр
                    <div><Building2 /><input name="organizationName" required minLength={2} placeholder="Номад Констракшн" /></div>
                  </label>
                )}
              </>
            )}

            {!inviteBlocked && (
              <label>
                И-мэйл хаяг
                {inviteInfo ? (
                  <div><Mail /><input value={inviteInfo.email} readOnly style={{ opacity: 0.7 }} /></div>
                ) : (
                  <div><Mail /><input name="email" type="email" required placeholder="name@company.mn" /></div>
                )}
              </label>
            )}
            {!inviteBlocked && (
              <label>
                Нууц үг
                <div>
                  <LockKeyhole />
                  <input name="password" type={show ? "text" : "password"} required minLength={8} placeholder="••••••••" />
                  <button type="button" onClick={() => setShow(!show)}>{show ? <EyeOff /> : <Eye />}</button>
                </div>
              </label>
            )}

            {mode === "login" && <Link href="/forgot-password">Нууц үгээ мартсан уу?</Link>}

            {error && <p className="form-error">{error}</p>}

            {!inviteBlocked && (
              <button className="glow-button submit" disabled={pending}>
                {pending ? "Нэвтэрч байна..." : <>{mode === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}<ArrowRight /></>}
              </button>
            )}

            <small>
              {mode === "login"
                ? <>Шинэ хэрэглэгч үү? <Link href="/register">Бүртгүүлэх</Link></>
                : <>Бүртгэлтэй юу? <Link href="/login">Нэвтрэх</Link></>}
            </small>
          </form>
        )}
      </section>
    </main>
  );
}
