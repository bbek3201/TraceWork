"use client";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { type ActionResult, unwrap } from "@/lib/action-result";

/**
 * A form for server actions that return an ActionResult: shows the action's error message
 * under the fields and, unlike `<form action>`, keeps what the user typed when it fails.
 */
export function ActionForm({
  action,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<ActionResult<unknown>>;
  className?: string;
  children: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        unwrap(await action(formData));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Алдаа гарлаа.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className={className} aria-busy={pending}>
      {children}
      {error && (
        <p role="alert" style={{ background: "#3a1420", border: "1px solid #6b1f34", color: "#ff8a9e", fontSize: 12.5, borderRadius: 8, padding: "10px 13px", marginTop: 8 }}>
          {error}
        </p>
      )}
    </form>
  );
}
