import { unstable_rethrow } from "next/navigation";

// Next.js replaces the message of any error thrown from a Server Action with a generic
// English text in production builds, so user-facing validation errors are returned as
// values instead and turned back into errors on the client with `unwrap`.

/** An expected, user-facing error whose message is safe to show in the UI. */
export class UserError extends Error {}

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

const GENERIC_ERROR = "Алдаа гарлаа. Дахин оролдоно уу.";

export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    unstable_rethrow(error); // let redirect()/notFound() through
    if (error instanceof UserError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Client side: returns the action's data, or throws its user-facing error message. */
export function unwrap<T>(result: ActionResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result.data;
}
