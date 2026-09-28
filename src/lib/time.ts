// Servers (e.g. Vercel) run in UTC, but the business day is Ulaanbaatar time.
// Mongolia has no DST, so the offset is a fixed +08:00.
export const APP_TIME_ZONE = "Asia/Ulaanbaatar";
const APP_UTC_OFFSET = "+08:00";

/** Today's calendar date in the app time zone, as UTC midnight (matches `@db.Date` columns). */
export function startOfAppDay(now = new Date()) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(now);
  return new Date(`${ymd}T00:00:00Z`);
}

/** Parses a `datetime-local` input value ("YYYY-MM-DDTHH:mm") as app-time-zone wall clock time. */
export function parseLocalDateTime(value: string) {
  return new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}${APP_UTC_OFFSET}`);
}
