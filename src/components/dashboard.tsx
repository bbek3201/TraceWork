"use client";

import {
  AlertTriangle, Box, BriefcaseBusiness, Building2, CalendarDays, Check,
  ChevronRight, ClipboardCheck, Clock3, FolderKanban, HelpCircle,
  Home, Menu, Play, Plus, Search, Settings, ShieldCheck,
  Sparkles, Timer, Users, X, BarChart3, LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NotificationBell, type NotificationItem } from "@/components/notification-bell";

const nav = [
  ["Нүүр", "/", Home], ["Төслүүд", "/projects", FolderKanban], ["Даалгавар", "/tasks", ClipboardCheck],
  ["Баталгаажуулалт", "/approvals", ShieldCheck], ["Ажилтнууд", "/employees", Users], ["Ирц", "/attendance", Clock3],
  ["Чөлөө", "/leave", CalendarDays], ["Агуулах", "/inventory", Box], ["Тайлан", "/reports", BarChart3],
] as const;

const projectColors = ["#50c878", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];

type TaskMetrics = { total: number; inProgress: number; awaitingReview: number; overdue: number };
type FocusTask = { title: string; projectName: string; dueLabel: string; progress: number; href: string } | null;
type TopProject = { id: string; name: string; progress: number; statusLabel: string };
type ReviewQueueItem = { id: string; title: string; projectName: string; assigneeName: string; statusLabel: string };
type WorkloadItem = { id: string; name: string; activeCount: number; pct: number };
type AttendanceToday = { checkInAt: string | null; checkOutAt: string | null };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  return <span className={`avatar avatar-${size}`}>{initials(name)}</span>;
}

function Sparkline({ color }: { color: string }) {
  return <svg viewBox="0 0 180 32" aria-hidden className="sparkline"><path d="M1 21 C15 7 29 28 43 17 S70 28 85 16 S111 28 126 17 S153 26 179 10" fill="none" stroke={color} strokeWidth="2" /></svg>;
}

function Sidebar({ mobile, close, canManageSettings }: { mobile: boolean; close: () => void; canManageSettings: boolean }) {
  const pathname = usePathname();
  return <aside className={`sidebar ${mobile ? "sidebar-mobile" : ""}`}>
    <div className="brand"><span>EVI</span><b>DO</b>{mobile && <button onClick={close} aria-label="Цэс хаах"><X size={20}/></button>}</div>
    <nav>
      {nav.map(([label, href, Icon]) => {
        const isActive = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={label} href={href} className={isActive ? "active" : ""} onClick={close}><Icon size={20}/><span>{label}</span></Link>;
      })}
      {canManageSettings && (
        <Link href="/settings" className={pathname.startsWith("/settings") ? "active" : ""} onClick={close}><Settings size={20}/><span>Тохиргоо</span></Link>
      )}
    </nav>
    <button className="logout" onClick={() => signOut({ callbackUrl: "/login" })}><LogOut size={18}/> Цэсийг гарах</button>
  </aside>;
}

function Topbar({ openMenu, organizationName, userName, notifications, unreadCount }: { openMenu: () => void; organizationName: string; userName: string; notifications: NotificationItem[]; unreadCount: number }) {
  return <header className="topbar">
    <button className="mobile-menu" onClick={openMenu} aria-label="Цэс нээх"><Menu size={21}/></button>
    <div className="org"><span className="org-icon"><Building2 size={18}/></span><b>{organizationName}</b><ChevronRight size={15}/></div>
    <label className="global-search"><Search size={19}/><input placeholder="Хайх эсвэл тушаал оруулах..."/><span>⌘ K</span></label>
    <div className="header-actions"><button aria-label="Тусламж"><HelpCircle size={19}/></button><NotificationBell notifications={notifications} unreadCount={unreadCount}/><Link href="/profile" aria-label="Профайл" style={{ display: "inline-flex" }}><Avatar name={userName}/></Link><span className="online"/></div>
  </header>;
}

function MetricCard({ icon: Icon, label, value, color }: { icon: typeof BriefcaseBusiness; label: string; value: string; color: string }) {
  return <article className="panel metric-card"><div className="metric-top"><span className="metric-icon" style={{color, borderColor: `${color}66`, background: `${color}18`}}><Icon size={23}/></span><div><div className="muted">{label}</div><strong>{value}</strong></div></div><Sparkline color={color}/></article>;
}

function Ring({ value }: { value: number }) {
  return <div className="ring" style={{background: `conic-gradient(#7c5cff ${value}%, #27313d 0)`}}><div><strong>{value}%</strong><span>Явц</span></div></div>;
}

function DashboardHome({
  userName, taskMetrics, focusTask, topProjects, reviewQueue, workload, atRiskCount, attendance,
}: {
  userName: string; taskMetrics: TaskMetrics; focusTask: FocusTask; topProjects: TopProject[];
  reviewQueue: ReviewQueueItem[]; workload: WorkloadItem[]; atRiskCount: number; attendance: AttendanceToday;
}) {
  return <div className="animate-enter">
    <div className="page-heading"><div><h1>Өглөөний мэнд, {userName}!</h1><p>Өнөөдрийн ажлын ерөнхий төлөв</p></div></div>
    <div className="dashboard-grid">
      <section className="main-column">
        <div className="metrics">
          <MetricCard icon={ClipboardCheck} label="Нийт даалгавар" value={String(taskMetrics.total)} color="#9b6cff"/>
          <MetricCard icon={Play} label="Явцад" value={String(taskMetrics.inProgress)} color="#4b91ff"/>
          <MetricCard icon={Timer} label="Шалгуулах" value={String(taskMetrics.awaitingReview)} color="#f5a623"/>
          <MetricCard icon={AlertTriangle} label="Хоцорсон" value={String(taskMetrics.overdue)} color="#ff4050"/>
        </div>
        <div className="work-grid">
          <article className="panel focus-card">
            <h2>Миний төвлөрөх ажил</h2>
            {focusTask ? (
              <>
                <span className="status blue">Явцад</span>
                <div className="focus-content">
                  <div>
                    <h3>{focusTask.title}</h3>
                    <p className="due"><CalendarDays size={16}/> {focusTask.dueLabel}</p>
                    <span className="eyebrow">{focusTask.projectName}</span>
                  </div>
                  <Ring value={focusTask.progress}/>
                </div>
                <div className="focus-actions">
                  <Link href={focusTask.href} className="glow-button" style={{ textDecoration: "none" }}><Play size={17}/> Ажлыг үргэлжлүүлэх</Link>
                </div>
              </>
            ) : (
              <p className="muted" style={{ marginTop: 14 }}>Одоогоор идэвхтэй ажил алга. <Link href="/tasks">Даалгавруудаа харах</Link></p>
            )}
          </article>
          <article className="panel projects-card"><div className="card-title"><h2>Төслийн явц</h2><Link href="/projects">Дэлгэрэнгүй <ChevronRight size={16}/></Link></div>
            {topProjects.length === 0 && <p className="muted">Идэвхтэй төсөл алга.</p>}
            {topProjects.map((p, i) => (
              <Link href={`/projects/${p.id}`} className="project-row" key={p.id} style={{ textDecoration: "none", color: "inherit" }}>
                <span className="project-thumb"><Building2 size={22}/></span>
                <div><b>{p.name}</b><div className="progress"><span style={{width:`${p.progress}%`,background:projectColors[i % projectColors.length]}}/></div></div>
                <strong>{p.progress}%</strong>
              </Link>
            ))}
          </article>
        </div>
        <article className="panel approvals">
          <h2>Баталгаажуулах ажлууд</h2>
          {reviewQueue.length === 0 && <p className="muted">Шалгах ажил алга.</p>}
          {reviewQueue.map((t) => (
            <div className="task-row" key={t.id}>
              <span className="task-thumb"><ClipboardCheck size={21}/></span>
              <div className="task-name"><b>{t.title}</b><span>{t.projectName}</span></div>
              <div className="task-person"><Avatar name={t.assigneeName} size="sm"/><span>{t.assigneeName}</span></div>
              <span className="task-type">{t.statusLabel}</span>
              <Link href={`/tasks/${t.id}`} className="review" style={{ textDecoration: "none" }}>Шалгах</Link>
            </div>
          ))}
          {reviewQueue.length > 0 && <Link href="/tasks" className="view-all">Бүгдийг харах <ChevronRight size={15}/></Link>}
        </article>
      </section>
      <aside className="right-column">
        <article className="panel attendance">
          <h2>Ирц</h2>
          {attendance.checkInAt ? (
            <>
              <div className="attendance-body"><div className="check-circle"><Check size={42}/></div><div><strong>{attendance.checkInAt}</strong><span>Ирсэн</span>{attendance.checkOutAt && <><hr/><b>{attendance.checkOutAt}</b><small>Явсан</small></>}</div></div>
              <span className="working"><i/> {attendance.checkOutAt ? "Явсан" : "Ажиллаж байна"}</span>
            </>
          ) : (
            <p className="muted" style={{ marginTop: 10 }}>Өнөөдөр ирц бүртгүүлээгүй байна. <Link href="/attendance">Ирц бүртгүүлэх</Link></p>
          )}
        </article>
        <article className="panel ai-card">
          <h2><Sparkles size={19}/> Эрсдэлийн анхаарал</h2>
          <Link href="/tasks" style={{ textDecoration: "none" }}>
            <AlertTriangle size={26}/><span><b>{atRiskCount} ажил хугацаа<br/>хэтрэх эрсдэлтэй байна.</b></span><ChevronRight size={18}/>
          </Link>
        </article>
        {workload.length > 0 && (
          <article className="panel workload">
            <div className="card-title"><h2>Багийн ачаалал</h2><Link href="/employees">Дэлгэрэнгүй</Link></div>
            {workload.map((m) => (
              <div className="member" key={m.id}>
                <Avatar name={m.name} size="sm"/>
                <div><b>{m.name}</b><span>{m.activeCount} идэвхтэй ажил</span></div>
                <div className="seg-progress"><span style={{width:`${m.pct}%`}}/></div>
                <strong>{m.activeCount}</strong>
              </div>
            ))}
          </article>
        )}
      </aside>
    </div>
  </div>;
}

export function Dashboard({
  userName, organizationName, notifications, unreadCount, taskMetrics, focusTask, topProjects, reviewQueue, workload, atRiskCount, attendance, canManageSettings,
}: {
  userName: string; organizationName: string; notifications: NotificationItem[]; unreadCount: number;
  taskMetrics: TaskMetrics; focusTask: FocusTask; topProjects: TopProject[]; reviewQueue: ReviewQueueItem[];
  workload: WorkloadItem[]; atRiskCount: number; attendance: AttendanceToday; canManageSettings: boolean;
}) {
  const [mobileNav, setMobileNav] = useState(false);
  return <div className="app-shell">
    <Sidebar mobile={false} close={()=>{}} canManageSettings={canManageSettings}/>
    {mobileNav && <><div className="overlay" onClick={()=>setMobileNav(false)}/><Sidebar mobile close={()=>setMobileNav(false)} canManageSettings={canManageSettings}/></>}
    <div className="content-shell">
      <Topbar openMenu={()=>setMobileNav(true)} organizationName={organizationName} userName={userName} notifications={notifications} unreadCount={unreadCount}/>
      <main className="page-content">
        <DashboardHome
          userName={userName}
          taskMetrics={taskMetrics}
          focusTask={focusTask}
          topProjects={topProjects}
          reviewQueue={reviewQueue}
          workload={workload}
          atRiskCount={atRiskCount}
          attendance={attendance}
        />
      </main>
      <Link href="/tasks/new" className="fab" aria-label="Шинэ ажил үүсгэх"><Plus size={29}/></Link>
    </div>
  </div>;
}
