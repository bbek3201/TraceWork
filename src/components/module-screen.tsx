"use client";
import { AlertTriangle, ArrowLeft, BarChart3, Boxes, Building2, CalendarDays, CheckCircle2, ChevronDown, ClipboardCheck, Download, Filter, MoreHorizontal, Paperclip, Plus, Search, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { assignRole, markTaskBlocked, reassignTask, recordStockMovement, reviewTask, startTask, submitTaskForReview, uploadEvidence } from "@/lib/actions";
import { roleLabel, stockMovementTypeLabel, taskBlockReasonLabel } from "@/lib/labels";

const ASSIGNABLE_ROLES = ["EMPLOYEE", "TEAM_LEAD", "MANAGER", "HR", "EXECUTIVE", "ADMIN"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

type LiveRow = { id: string; title: string; subtitle: string; progressLabel: string; status: string; ok: boolean };
type LiveModuleData = {
  icon: "project" | "task" | "employee" | "product";
  title: string;
  subtitle: string;
  createHref?: string;
  secondaryLinks?: { href: string; label: string }[];
  metrics: [string, string, string][];
  rows: LiveRow[];
};

export function ModuleScreen({ slug, userName, live }: { slug: string; userName: string; live: LiveModuleData }) {
  const [query, setQuery] = useState("");

  const rows = live.rows.filter((r) => `${r.title} ${r.subtitle}`.toLowerCase().includes(query.toLowerCase()));
  const RowIcon = live.icon === "task" ? ClipboardCheck : live.icon === "employee" ? Users : live.icon === "product" ? Boxes : Building2;
  return (
    <main className="standalone">
        <header className="module-header">
          <Link href="/" className="back"><ArrowLeft /> EVIDO</Link>
          <div className="module-org"><Building2 /> {live.title}</div>
          <label><Search /><input placeholder="Хайх эсвэл тушаал оруулах..." /></label>
          <Link href="/profile" className="module-user" style={{ textDecoration: "none", color: "inherit" }} aria-label="Профайл">{initials(userName)}</Link>
        </header>
        <section className="module-content">
          <div className="module-heading">
            <div><h1>{live.title}</h1><p>{live.subtitle}</p></div>
            <div>
              {live.secondaryLinks?.map((link) => (
                <Link key={link.href} href={link.href} className="export" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                  {link.label}
                </Link>
              ))}
              <button className="export"><Download /> Экспорт</button>
              {live.createHref && <Link href={live.createHref} className="glow-button new-action"><Plus /> Шинээр үүсгэх</Link>}
            </div>
          </div>
          <div className="big-metrics">
            {live.metrics.map(([label, value, color], i) => (
              <article className="panel" key={label}>
                <span className={`big-icon ${color}`}>{[<ClipboardCheck key="1" />, <CheckCircle2 key="2" />, <AlertTriangle key="3" />, <BarChart3 key="4" />][i]}</span>
                <div><small>{label}</small><strong>{value}</strong></div>
              </article>
            ))}
          </div>
          <article className="panel data-panel">
            <div className="data-toolbar">
              <label><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`${live.title} хайх...`} /></label>
              <button className="selected">Бүгд</button>
              <button><Filter /> Шүүлтүүр</button>
              <button><CalendarDays /> Огноо <ChevronDown /></button>
            </div>
            <div className="data-head"><span>Нэр / мэдээлэл</span><span>Төлөв</span><span>Явц / үзүүлэлт</span><span /></div>
            {rows.map((row) => (
              <Link href={`/${slug}/${row.id}`} className="data-row" key={row.id}>
                <span className="row-main"><i><RowIcon /></i><b>{row.title}</b><small>{row.subtitle}</small></span>
                <span className={`pill ${row.ok ? "ok" : "warn"}`}>{row.status}</span>
                <span className="row-progress"><i><b style={{ width: row.progressLabel }} /></i><strong>{row.progressLabel}</strong></span>
                <MoreHorizontal />
              </Link>
            ))}
            {rows.length === 0 && (
              <div className="empty">
                <Search />
                <h3>Илэрц олдсонгүй</h3>
                <p>{live.rows.length === 0 ? "Одоогоор бүртгэл алга. Шинээр үүсгэж эхлээрэй." : "Хайлтын утгаа өөрчилж үзнэ үү."}</p>
              </div>
            )}
          </article>
        </section>
      </main>
  );
}

type LiveProjectDetail = {
  kind: "project";
  title: string; subtitle: string; statusLabel: string; statusOk: boolean; description: string;
  progress: number; department: string; startDate: string; dueDate: string;
  tasks: { id: string; title: string; statusLabel: string; ok: boolean }[];
};
type LiveTaskDetail = {
  kind: "task";
  title: string; subtitle: string; status: string; statusLabel: string; statusOk: boolean; description: string;
  progress: number; projectName: string; priority: number; difficulty: number;
  basePoints: string; dueDate: string; assignees: string[]; createdBy: string;
  checklist: { title: string; done: boolean }[];
  requirements: {
    id: string;
    title: string;
    fulfilled: boolean;
    evidence: { id: string; fileAssetId: string | null; note: string | null; uploadedBy: string; uploadedAt: string }[];
  }[];
  isAssignee: boolean;
  canReview: boolean;
  canApprove: boolean;
  riskLevelLabel: string;
  approvalStep: number;
  approvalStepsRequired: number;
  canUpload: boolean;
  blockedReason: string | null;
  blockedNote: string | null;
  dependencies: { id: string; title: string; statusLabel: string; typeLabel: string; done: boolean }[];
  dependents: { id: string; title: string; statusLabel: string }[];
  handovers: { id: string; fromName: string; toName: string; typeLabel: string; note: string | null; at: string }[];
  score: { basePoint: string; deadlineCoefficient: string; qualityCoefficient: string; evidenceCoefficient: string; finalScore: string } | null;
  history: { version: number; decision: string; reason: string | null; reviewer: string; at: string }[];
};
type LiveEmployeeDetail = {
  kind: "employee";
  title: string; subtitle: string; statusLabel: string; statusOk: boolean; description: string;
  progress: number; email: string; department: string; branch: string; roles: string[];
  currentRole: string; canAssignRole: boolean;
  canReassign: boolean; otherMembers: { id: string; name: string }[];
  canViewPerformance: boolean;
  performance: { totalScore: string; scoredTaskCount: number; onTimeRate: number; avgQuality: string } | null;
  bonusRecommended: boolean;
  tasks: { id: string; title: string; status: string; statusLabel: string; ok: boolean }[];
  projects: { id: string; name: string }[];
};
type LiveProductDetail = {
  kind: "product";
  title: string; subtitle: string; statusLabel: string; statusOk: boolean; description: string;
  progress: number; sku: string; barcode: string | null; unit: string; onHand: number; reorderPoint: number;
  canRecord: boolean;
  movements: { id: string; type: string; quantity: number; note: string | null; createdBy: string; at: string }[];
};
type LiveDetail = LiveProjectDetail | LiveTaskDetail | LiveEmployeeDetail | LiveProductDetail;

const reviewDecisionLabel: Record<string, string> = {
  APPROVED: "Батласан",
  CHANGES_REQUIRED: "Засвар шаардсан",
  REJECTED: "Татгалзсан",
};

const resumableTaskStatuses = new Set(["ASSIGNED", "CHANGES_REQUIRED", "REJECTED", "OVERDUE", "BLOCKED", "WAITING"]);
const blockableTaskStatuses = new Set(["IN_PROGRESS"]);
const blockReasonOptions = [
  "MISSING_DOCUMENT",
  "WAITING_APPROVAL",
  "WAITING_SUPPLIER",
  "WAITING_CUSTOMER",
  "WAITING_PAYMENT",
  "MISSING_MATERIAL",
  "TECHNICAL_ISSUE",
  "SYSTEM_ISSUE",
  "PREVIOUS_TASK_INCOMPLETE",
  "OTHER",
];

function TaskReviewActions({ taskId, canApprove }: { taskId: string; canApprove: boolean }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [qualityScore, setQualityScore] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: string) {
    setError(null);
    setPending(true);
    try {
      const fd = new FormData();
      fd.set("taskId", taskId);
      fd.set("decision", decision);
      fd.set("reason", reason);
      if (decision === "APPROVED" && qualityScore) fd.set("qualityScore", qualityScore);
      await reviewTask(fd);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ marginTop: 18 }}>
      {canApprove && (
        <label style={{ display: "block", fontSize: 12, color: "#c8d0da", marginBottom: 10 }}>
          Чанарын үнэлгээ (заавал биш)
          <select
            value={qualityScore}
            onChange={(e) => setQualityScore(e.target.value)}
            style={{ display: "block", marginTop: 5, background: "#0a141f", border: "1px solid #263746", borderRadius: 6, padding: "8px 10px", color: "#fff" }}
          >
            <option value="">Үнэлээгүй</option>
            <option value="5">5 — Маш сайн</option>
            <option value="4">4 — Сайн</option>
            <option value="3">3 — Хэвийн</option>
            <option value="2">2 — Дундаас доогуур</option>
            <option value="1">1 — Муу</option>
          </select>
        </label>
      )}
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="Шалтгаан (Засвар шаардах / Татгалзах / Бага үнэлгээ өгөхөд заавал)"
        style={{ width: "100%", background: "#0a141f", border: "1px solid #263746", borderRadius: 8, padding: "10px 12px", color: "#fff", font: "inherit", resize: "vertical" }}
      />
      {error && <p style={{ background: "#3a1420", border: "1px solid #6b1f34", color: "#ff8a9e", fontSize: 12.5, borderRadius: 8, padding: "10px 13px", marginTop: 8 }}>{error}</p>}
      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        {canApprove && (
          <button disabled={pending} onClick={() => decide("APPROVED")} className="glow-button submit" type="button" style={{ width: "auto", height: 40, padding: "0 18px", margin: 0 }}>Батлах</button>
        )}
        <button disabled={pending} onClick={() => decide("CHANGES_REQUIRED")} type="button" style={{ height: 40, padding: "0 18px", borderRadius: 7, border: "1px solid #6d5410", color: "#ffba28", background: "#372906" }}>Засвар шаардах</button>
        <button disabled={pending} onClick={() => decide("REJECTED")} type="button" style={{ height: 40, padding: "0 18px", borderRadius: 7, border: "1px solid #92323a", color: "#ff6670", background: "#40151a" }}>Татгалзах</button>
      </div>
      {!canApprove && (
        <p className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>Энэ шатны эцсийн баталгаажуулалт хийх эрхгүй тул зөвхөн засвар/татгалзах боломжтой.</p>
      )}
    </div>
  );
}

function MarkBlockedForm({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const [error, formAction, pending] = useActionState(async (_prev: string | null, formData: FormData) => {
    formData.set("taskId", taskId);
    try {
      await markTaskBlocked(formData);
      setOpen(false);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ height: 42, padding: "0 18px", borderRadius: 7, border: "1px solid #6d5410", color: "#ffba28", background: "#372906" }}
      >
        Хойшлуулах / Хориглох
      </button>
    );
  }

  return (
    <form action={formAction} style={{ border: "1px solid #233441", borderRadius: 8, padding: 14, display: "grid", gap: 10, maxWidth: 420 }}>
      <label style={{ fontSize: 12, color: "#c8d0da" }}>
        Төлөв
        <select name="targetStatus" defaultValue="BLOCKED" style={{ width: "100%", marginTop: 5, background: "#0a141f", border: "1px solid #263746", borderRadius: 6, padding: "8px 10px", color: "#fff" }}>
          <option value="BLOCKED">Хориглогдсон</option>
          <option value="WAITING">Хүлээгдэж байна</option>
        </select>
      </label>
      <label style={{ fontSize: 12, color: "#c8d0da" }}>
        Шалтгаан
        <select name="reason" defaultValue="OTHER" style={{ width: "100%", marginTop: 5, background: "#0a141f", border: "1px solid #263746", borderRadius: 6, padding: "8px 10px", color: "#fff" }}>
          {blockReasonOptions.map((r) => (
            <option key={r} value={r}>{taskBlockReasonLabel[r] ?? r}</option>
          ))}
        </select>
      </label>
      <label style={{ fontSize: 12, color: "#c8d0da" }}>
        Тайлбар
        <textarea name="note" rows={2} placeholder="Дэлгэрэнгүй тайлбар (заавал биш)" style={{ width: "100%", marginTop: 5, background: "#0a141f", border: "1px solid #263746", borderRadius: 6, padding: "8px 10px", color: "#fff", font: "inherit", resize: "vertical" }} />
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button disabled={pending} type="submit" style={{ height: 38, padding: "0 16px", borderRadius: 6, border: "1px solid #6d5410", color: "#ffba28", background: "#372906" }}>
          {pending ? "Хадгалж байна..." : "Хадгалах"}
        </button>
        <button type="button" onClick={() => setOpen(false)} style={{ height: 38, padding: "0 16px", borderRadius: 6, border: "1px solid #354554", background: "none", color: "#9aa5b2" }}>
          Цуцлах
        </button>
      </div>
      {error && errorBox(error)}
    </form>
  );
}

function errorBox(message: string) {
  return <p style={{ background: "#3a1420", border: "1px solid #6b1f34", color: "#ff8a9e", fontSize: 12.5, borderRadius: 8, padding: "10px 13px", marginTop: 8 }}>{message}</p>;
}

function StartTaskButton({ taskId }: { taskId: string }) {
  const [error, formAction, pending] = useActionState(async (_prev: string | null, formData: FormData) => {
    formData.set("taskId", taskId);
    try {
      await startTask(formData);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);

  return (
    <form action={formAction} style={{ marginBottom: 24 }}>
      <button disabled={pending} className="glow-button submit" type="submit" style={{ width: "auto", height: 42, padding: "0 18px", margin: 0 }}>
        {pending ? "Түр хүлээнэ үү..." : "Ажил эхлүүлэх"}
      </button>
      {error && errorBox(error)}
    </form>
  );
}

function SubmitForReviewButton({ taskId }: { taskId: string }) {
  const [error, formAction, pending] = useActionState(async (_prev: string | null, formData: FormData) => {
    formData.set("taskId", taskId);
    try {
      await submitTaskForReview(formData);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);

  return (
    <form action={formAction} style={{ marginBottom: 24 }}>
      <button disabled={pending} className="glow-button submit" type="submit" style={{ width: "auto", height: 42, padding: "0 18px", margin: 0 }}>
        {pending ? "Илгээж байна..." : "Шалгуулахаар илгээх"}
      </button>
      {error && errorBox(error)}
    </form>
  );
}

function EvidenceUploadForm({ taskId, requirementId }: { taskId: string; requirementId: string }) {
  const [error, formAction, pending] = useActionState(async (_prev: string | null, formData: FormData) => {
    formData.set("taskId", taskId);
    formData.set("requirementId", requirementId);
    try {
      await uploadEvidence(formData);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);

  return (
    <form action={formAction} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
      <input type="file" name="file" required style={{ fontSize: 12, color: "#9aa5b2", maxWidth: 220 }} />
      <input type="text" name="note" placeholder="Тэмдэглэл (заавал биш)" style={{ background: "#0a141f", border: "1px solid #263746", borderRadius: 6, padding: "6px 10px", color: "#fff", fontSize: 12, flex: 1, minWidth: 140 }} />
      <button disabled={pending} type="submit" style={{ height: 32, padding: "0 12px", borderRadius: 6, border: "1px solid #6540a7", background: "none", color: "#aa7dff", fontSize: 12 }}>
        {pending ? "Илгээж байна..." : "Хавсаргах"}
      </button>
      {error && <span style={{ color: "#ff8a9e", fontSize: 11, width: "100%" }}>{error}</span>}
    </form>
  );
}

function RecordMovementForm({ productId }: { productId: string }) {
  const [error, formAction, pending] = useActionState(async (_prev: string | null, formData: FormData) => {
    formData.set("productId", productId);
    try {
      await recordStockMovement(formData);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);

  return (
    <form action={formAction} className="simple-form" style={{ maxWidth: 420, marginTop: 12 }}>
      <label>
        Төрөл
        <select name="type" defaultValue="RECEIPT">
          <option value="RECEIPT">Хүлээн авалт</option>
          <option value="ISSUE">Зарлага</option>
          <option value="ADJUSTMENT">Тохируулга</option>
        </select>
      </label>
      <label>Тоо хэмжээ<input name="quantity" type="number" required /></label>
      <label>Тэмдэглэл<input name="note" type="text" placeholder="Заавал биш" /></label>
      <button disabled={pending} className="glow-button submit" type="submit" style={{ width: "auto", height: 40, padding: "0 16px" }}>
        {pending ? "Бүртгэж байна..." : "Бүртгэх"}
      </button>
      {error && errorBox(error)}
    </form>
  );
}

function RoleAssignForm({ memberId, currentRole }: { memberId: string; currentRole: string }) {
  const [error, formAction, pending] = useActionState(async (_prev: string | null, formData: FormData) => {
    formData.set("memberId", memberId);
    try {
      await assignRole(formData);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);

  return (
    <form action={formAction} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
      <select
        name="role"
        defaultValue={currentRole}
        style={{ background: "#0a141f", border: "1px solid #263746", borderRadius: 6, padding: "6px 8px", color: "#fff", fontSize: 12 }}
      >
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r} value={r}>{roleLabel[r] ?? r}</option>
        ))}
      </select>
      <button disabled={pending} type="submit" style={{ height: 30, padding: "0 12px", borderRadius: 6, border: "1px solid #6540a7", background: "none", color: "#aa7dff", fontSize: 12 }}>
        {pending ? "..." : "Хадгалах"}
      </button>
      {error && <span style={{ color: "#ff8a9e", fontSize: 11 }}>{error}</span>}
    </form>
  );
}

function ReassignTaskForm({ taskId, otherMembers }: { taskId: string; otherMembers: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [error, formAction, pending] = useActionState(async (_prev: string | null, formData: FormData) => {
    formData.set("taskId", taskId);
    try {
      await reassignTask(formData);
      setOpen(false);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "Алдаа гарлаа.";
    }
  }, null);

  if (otherMembers.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "1px solid #354554", background: "none", color: "#9aa5b2", fontSize: 11 }}
      >
        Шилжүүлэх
      </button>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
      <select name="toMemberId" defaultValue="" required style={{ background: "#0a141f", border: "1px solid #263746", borderRadius: 6, padding: "6px 8px", color: "#fff", fontSize: 12 }}>
        <option value="" disabled>Орлох ажилтан</option>
        {otherMembers.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>
      <select name="transferType" defaultValue="TEMPORARY" style={{ background: "#0a141f", border: "1px solid #263746", borderRadius: 6, padding: "6px 8px", color: "#fff", fontSize: 12 }}>
        <option value="TEMPORARY">Түр</option>
        <option value="PERMANENT">Бүрэн</option>
      </select>
      <input name="note" type="text" placeholder="Тэмдэглэл" style={{ background: "#0a141f", border: "1px solid #263746", borderRadius: 6, padding: "6px 8px", color: "#fff", fontSize: 12, minWidth: 120 }} />
      <button disabled={pending} type="submit" style={{ height: 30, padding: "0 12px", borderRadius: 6, border: "1px solid #6540a7", background: "none", color: "#aa7dff", fontSize: 12 }}>
        {pending ? "..." : "Батлах"}
      </button>
      <button type="button" onClick={() => setOpen(false)} style={{ height: 30, padding: "0 10px", borderRadius: 6, border: "1px solid #354554", background: "none", color: "#9aa5b2", fontSize: 12 }}>
        Цуцлах
      </button>
      {error && <span style={{ color: "#ff8a9e", fontSize: 11, width: "100%" }}>{error}</span>}
    </form>
  );
}

export function DetailScreen({ slug, id, live }: { slug: string; id: string; live: LiveDetail }) {
  return (
      <main className="standalone">
        <header className="module-header">
          <Link href={`/${slug}`} className="back"><ArrowLeft /> Буцах</Link>
          <div className="module-org"><ShieldCheck /> EVIDO</div>
        </header>
        <section className="detail-content">
          <div className="detail-title">
            <span className={`pill ${live.statusOk ? "ok" : "warn"}`}>{live.statusLabel}</span>
            <h1>{live.title}</h1>
            <p>{live.subtitle}</p>
          </div>
          <div className="detail-grid">
            <article className="panel detail-main">
              <h2>Тайлбар</h2>
              <p>{live.description}</p>
              <h2>Гүйцэтгэлийн явц</h2>
              <div className="detail-progress"><span><b style={{ width: `${live.progress}%` }} /></span><strong>{live.progress}%</strong></div>
              {live.kind === "task" && (
                <>
                  {live.approvalStepsRequired > 1 && (
                    <div style={{ background: "#0f1e2e", border: "1px solid #1a2a38", borderRadius: 8, padding: "10px 13px", marginBottom: 18, fontSize: 12.5, color: "#aa7dff" }}>
                      Олон шатны баталгаажуулалт ({live.riskLevelLabel} эрсдэл): {live.approvalStep}/{live.approvalStepsRequired} шат зөвшөөрөгдсөн.
                    </div>
                  )}
                  {live.score && (
                    <div style={{ background: "#11331b", border: "1px solid #285c35", borderRadius: 8, padding: "10px 13px", marginBottom: 18, fontSize: 12.5, color: "#55d177" }}>
                      <b>Эцсийн оноо: {live.score.finalScore}</b>
                      <div style={{ marginTop: 3, color: "#8fd6a1" }}>
                        Үндсэн оноо {live.score.basePoint} × Хугацаа {live.score.deadlineCoefficient} × Чанар {live.score.qualityCoefficient} × Нотолгоо {live.score.evidenceCoefficient}
                      </div>
                    </div>
                  )}
                  {(live.blockedReason || live.blockedNote) && (
                    <div style={{ background: "#3b2903", border: "1px solid #6d5410", borderRadius: 8, padding: "10px 13px", marginBottom: 18, fontSize: 12.5, color: "#ffba28" }}>
                      <b>{live.blockedReason ?? "Шалтгаан заагаагүй"}</b>
                      {live.blockedNote && <div style={{ marginTop: 4, color: "#e0c07a" }}>{live.blockedNote}</div>}
                    </div>
                  )}
                  {live.isAssignee && resumableTaskStatuses.has(live.status) && (
                    <div style={{ marginBottom: 24 }}><StartTaskButton taskId={id} /></div>
                  )}
                  {live.isAssignee && blockableTaskStatuses.has(live.status) && (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24, alignItems: "flex-start" }}>
                      <SubmitForReviewButton taskId={id} />
                      <MarkBlockedForm taskId={id} />
                    </div>
                  )}
                  {live.canReview && (live.status === "SUBMITTED" || live.status === "UNDER_REVIEW") && (
                    <TaskReviewActions taskId={id} canApprove={live.canApprove} />
                  )}
                </>
              )}
              {live.kind === "project" ? (
                <>
                  <h2>Ажлууд ({live.tasks.length})</h2>
                  {live.tasks.length === 0 && <p className="muted">Одоогоор ажил үүсгээгүй байна.</p>}
                  {live.tasks.map((t) => (
                    <div className="evidence" key={t.id}>
                      <span className={t.ok ? "complete" : "pending"}>{t.ok ? <CheckCircle2 /> : <AlertTriangle />}</span>
                      <div><b>{t.title}</b><small>{t.statusLabel}</small></div>
                    </div>
                  ))}
                </>
              ) : live.kind === "employee" ? (
                <>
                  {live.canViewPerformance && live.performance ? (
                    <>
                      <h2>Гүйцэтгэлийн үзүүлэлт{live.bonusRecommended && <span style={{ marginLeft: 10, fontSize: 11, color: "#55d177", background: "#11331b", border: "1px solid #285c35", borderRadius: 6, padding: "3px 8px" }}>Урамшууллын санал</span>}</h2>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 20 }}>
                        <div className="panel" style={{ padding: "12px 14px" }}><small className="muted">Нийт оноо</small><br /><strong style={{ fontSize: 20 }}>{live.performance.totalScore}</strong></div>
                        <div className="panel" style={{ padding: "12px 14px" }}><small className="muted">Дууссан ажил</small><br /><strong style={{ fontSize: 20 }}>{live.performance.scoredTaskCount}</strong></div>
                        <div className="panel" style={{ padding: "12px 14px" }}><small className="muted">Хугацаандаа</small><br /><strong style={{ fontSize: 20 }}>{live.performance.onTimeRate}%</strong></div>
                        <div className="panel" style={{ padding: "12px 14px" }}><small className="muted">Дундаж чанар</small><br /><strong style={{ fontSize: 20 }}>{live.performance.avgQuality}/5</strong></div>
                      </div>
                    </>
                  ) : (
                    <p className="muted" style={{ marginBottom: 16 }}>Гүйцэтгэлийн үзүүлэлтийг зөвхөн ажилтан өөрөө болон тайлан харах эрхтэй хүн харна.</p>
                  )}
                  <h2>Оноогдсон ажлууд ({live.tasks.length})</h2>
                  {live.tasks.length === 0 && <p className="muted">Одоогоор ажил оноогоогүй байна.</p>}
                  {live.tasks.map((t) => (
                    <div className="evidence" key={t.id} style={{ height: "auto", flexWrap: "wrap", padding: "10px 13px" }}>
                      <span className={t.ok ? "complete" : "pending"}>{t.ok ? <CheckCircle2 /> : <AlertTriangle />}</span>
                      <div style={{ flex: 1 }}><b>{t.title}</b><small>{t.statusLabel}</small></div>
                      {live.canReassign && t.status !== "COMPLETED" && t.status !== "CANCELLED" && (
                        <ReassignTaskForm taskId={t.id} otherMembers={live.otherMembers} />
                      )}
                    </div>
                  ))}
                  <h2>Төслүүд ({live.projects.length})</h2>
                  {live.projects.length === 0 && <p className="muted">Төсөлд гишүүнээр ороогүй байна.</p>}
                  {live.projects.map((p) => (
                    <div className="evidence" key={p.id}>
                      <span className="complete"><Building2 size={18} /></span>
                      <div><b>{p.name}</b></div>
                    </div>
                  ))}
                </>
              ) : live.kind === "task" ? (
                <>
                  {(live.dependencies.length > 0 || live.dependents.length > 0) && (
                    <>
                      <h2>Хамааралтай ажлууд</h2>
                      {live.dependencies.map((d) => (
                        <div className="evidence" key={`dep-${d.id}`}>
                          <span className={d.done ? "complete" : "pending"}>{d.done ? <CheckCircle2 /> : <AlertTriangle />}</span>
                          <div><b>{d.title}</b><small>{d.typeLabel} · {d.statusLabel}</small></div>
                        </div>
                      ))}
                      {live.dependents.map((d) => (
                        <div className="evidence" key={`dep-of-${d.id}`}>
                          <span className="pending"><ClipboardCheck size={18} /></span>
                          <div><b>{d.title}</b><small>Энэ ажлаас хамаарна · {d.statusLabel}</small></div>
                        </div>
                      ))}
                    </>
                  )}
                  <h2>Чеклист</h2>
                  {live.checklist.length === 0 && <p className="muted">Чеклист тодорхойлоогүй байна.</p>}
                  {live.checklist.map((c) => (
                    <div className="evidence" key={c.title}>
                      <span className={c.done ? "complete" : "pending"}>{c.done ? <CheckCircle2 /> : <AlertTriangle />}</span>
                      <div><b>{c.title}</b><small>{c.done ? "Гүйцэтгэсэн" : "Хүлээгдэж байна"}</small></div>
                    </div>
                  ))}
                  <h2>Нотолгооны шаардлага</h2>
                  {live.requirements.length === 0 && <p className="muted">Шаардлагатай нотолгоо тодорхойлоогүй байна.</p>}
                  {live.requirements.map((r) => (
                    <div key={r.id} style={{ border: "1px solid #233441", borderRadius: 8, padding: "10px 13px", margin: "8px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span className={r.fulfilled ? "complete" : "pending"} style={{ width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0 }}>
                          {r.fulfilled ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                        </span>
                        <div style={{ flex: 1 }}>
                          <b style={{ fontSize: 12 }}>{r.title}</b>
                          <br /><small style={{ color: "#7f8d9b" }}>{r.fulfilled ? "Баталгаажсан" : "Хүлээгдэж байна"}</small>
                        </div>
                      </div>
                      {r.evidence.length > 0 && (
                        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                          {r.evidence.map((e) => (
                            <a
                              key={e.id}
                              href={e.fileAssetId ? `/api/files/${e.fileAssetId}` : "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#aa7dff", textDecoration: "none" }}
                            >
                              <Paperclip size={13} />
                              <span>{e.uploadedBy} · {e.uploadedAt}{e.note ? ` — ${e.note}` : ""}</span>
                            </a>
                          ))}
                        </div>
                      )}
                      {live.canUpload && <EvidenceUploadForm taskId={id} requirementId={r.id} />}
                    </div>
                  ))}
                  {live.history.length > 0 && (
                    <>
                      <h2>Шалгалтын түүх</h2>
                      {live.history.map((h, i) => (
                        <div className="evidence" key={`${h.at}-${i}`}>
                          <span className={h.decision === "APPROVED" ? "complete" : "pending"}>{h.decision === "APPROVED" ? <CheckCircle2 /> : <AlertTriangle />}</span>
                          <div>
                            <b>{reviewDecisionLabel[h.decision] ?? h.decision} · v{h.version} · {h.reviewer}</b>
                            <small>{h.at}{h.reason ? ` — ${h.reason}` : ""}</small>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {live.handovers.length > 0 && (
                    <>
                      <h2>Шилжүүлгийн түүх</h2>
                      {live.handovers.map((h) => (
                        <div className="evidence" key={h.id}>
                          <span className="pending"><Users size={18} /></span>
                          <div>
                            <b>{h.fromName} → {h.toName} · {h.typeLabel}</b>
                            <small>{h.at}{h.note ? ` — ${h.note}` : ""}</small>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              ) : (
                <>
                  <h2>Барааны хөдөлгөөн ({live.movements.length})</h2>
                  {live.canRecord && <RecordMovementForm productId={id} />}
                  {live.movements.length === 0 && <p className="muted">Хөдөлгөөн бүртгэгдээгүй байна.</p>}
                  {live.movements.map((m) => (
                    <div className="evidence" key={m.id}>
                      <span className={m.type === "ISSUE" ? "pending" : "complete"}>{m.type === "ISSUE" ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}</span>
                      <div>
                        <b>{stockMovementTypeLabel[m.type] ?? m.type} · {m.type === "ISSUE" ? "-" : "+"}{Math.abs(m.quantity)} {live.unit} · {m.createdBy}</b>
                        <small>{m.at}{m.note ? ` — ${m.note}` : ""}</small>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </article>
            <aside className="panel detail-side">
              <h2>Дэлгэрэнгүй мэдээлэл</h2>
              <dl>
                {live.kind === "project" ? (
                  <>
                    <dt>Хэлтэс</dt><dd>{live.department}</dd>
                    <dt>Эхлэх огноо</dt><dd>{live.startDate}</dd>
                    <dt>Дуусах хугацаа</dt><dd>{live.dueDate}</dd>
                  </>
                ) : live.kind === "employee" ? (
                  <>
                    <dt>И-мэйл</dt><dd>{live.email}</dd>
                    <dt>Хэлтэс</dt><dd>{live.department}</dd>
                    <dt>Салбар</dt><dd>{live.branch}</dd>
                    <dt>Эрх</dt>
                    <dd>
                      {live.canAssignRole
                        ? <RoleAssignForm memberId={id} currentRole={live.currentRole} />
                        : (live.roles.length ? live.roles.map((r) => roleLabel[r] ?? r).join(", ") : "Оноогоогүй")}
                    </dd>
                  </>
                ) : live.kind === "product" ? (
                  <>
                    <dt>SKU</dt><dd>{live.sku}</dd>
                    <dt>Barcode</dt><dd>{live.barcode ?? "—"}</dd>
                    <dt>Үлдэгдэл</dt><dd>{live.onHand} {live.unit}</dd>
                    <dt>Захиалах доод хэмжээ</dt><dd>{live.reorderPoint} {live.unit}</dd>
                  </>
                ) : (
                  <>
                    <dt>Төсөл</dt><dd>{live.projectName}</dd>
                    <dt>Эрсдэл</dt><dd>{live.riskLevelLabel}</dd>
                    <dt>Ач холбогдол</dt><dd>{live.priority}</dd>
                    <dt>Түвэгшил</dt><dd>{live.difficulty}</dd>
                    <dt>Үндсэн оноо</dt><dd>{live.basePoints}</dd>
                    <dt>Дуусах хугацаа</dt><dd>{live.dueDate}</dd>
                    <dt>Хариуцагч</dt><dd>{live.assignees.length ? live.assignees.join(", ") : "Оноогоогүй"}</dd>
                    <dt>Үүсгэсэн</dt><dd>{live.createdBy}</dd>
                  </>
                )}
              </dl>
            </aside>
          </div>
        </section>
      </main>
  );
}
