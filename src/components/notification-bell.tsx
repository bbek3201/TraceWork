"use client";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions";

export type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  entityType: string | null;
  entityId: string | null;
  readAt: Date | null;
  createdAt: Date;
};

function notificationHref(n: NotificationItem) {
  if (n.entityType === "Task" && n.entityId) return `/tasks/${n.entityId}`;
  if (n.entityType === "LeaveRequest") return "/leave";
  return "/";
}

export function NotificationBell({ notifications, unreadCount }: { notifications: NotificationItem[]; unreadCount: number }) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  function handleClick(n: NotificationItem) {
    setOpen(false);
    if (!n.readAt) {
      startTransition(async () => {
        const fd = new FormData();
        fd.set("notificationId", n.id);
        await markNotificationRead(fd);
      });
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button className="notification" aria-label="Мэдэгдэл" onClick={() => setOpen((v) => !v)}>
        <Bell size={20} />
        {unreadCount > 0 && <i />}
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 70 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 44,
              width: 340,
              maxHeight: 420,
              overflowY: "auto",
              background: "#0b1927",
              border: "1px solid #1a2a38",
              borderRadius: 10,
              boxShadow: "0 12px 30px rgba(0,0,0,.35)",
              zIndex: 80,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid #1a2a38" }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Мэдэгдэл</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => startTransition(async () => { await markAllNotificationsRead(); })}
                  style={{ fontSize: 11, color: "#aa7dff", background: "none", border: 0 }}
                >
                  Бүгдийг уншсан
                </button>
              )}
            </div>
            {notifications.length === 0 && <p style={{ padding: 16, fontSize: 12, color: "#8793a3" }}>Мэдэгдэл алга.</p>}
            {notifications.map((n) => (
              <Link
                key={n.id}
                href={notificationHref(n)}
                onClick={() => handleClick(n)}
                style={{ display: "block", padding: "10px 14px", borderBottom: "1px solid #14212e", textDecoration: "none", color: "#e7ebf1", background: n.readAt ? "transparent" : "#0f1e2e" }}
              >
                <div style={{ fontSize: 12.5, fontWeight: n.readAt ? 400 : 700 }}>{n.title}</div>
                {n.body && <div style={{ fontSize: 11.5, color: "#8793a3", marginTop: 2 }}>{n.body}</div>}
                <div style={{ fontSize: 10.5, color: "#5c6a79", marginTop: 3 }}>{n.createdAt.toLocaleString("mn-MN")}</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
