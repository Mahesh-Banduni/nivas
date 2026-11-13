/** Deterministic date helpers. All dates are UTC, check-out is exclusive. */

export const DAY_MS = 86_400_000;

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function toDateOnly(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

export function parseDate(date: string): Date {
  return new Date(`${toDateOnly(date)}T00:00:00.000Z`);
}

export function addDays(date: string, days: number): string {
  const d = parseDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonths(date: string, months: number): string {
  const d = parseDate(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((parseDate(checkOut).getTime() - parseDate(checkIn).getTime()) / DAY_MS);
}

/** Check-in inclusive, check-out exclusive. */
export function eachNight(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  const total = nightsBetween(checkIn, checkOut);
  for (let i = 0; i < total; i += 1) nights.push(addDays(checkIn, i));
  return nights;
}

export function isBefore(a: string, b: string): boolean {
  return toDateOnly(a) < toDateOnly(b);
}

export function todayOrLater(date: string): boolean {
  return toDateOnly(date) >= todayISO();
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = MONTHS.map((month) => month.slice(0, 3));

export function formatDate(date: string, style: "short" | "long" | "weekday" = "short"): string {
  const d = parseDate(date);
  const day = d.getUTCDate();
  const month = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  if (style === "long") return `${day} ${month} ${year}`;
  if (style === "weekday") {
    const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getUTCDay()];
    return `${weekday}, ${day} ${MONTHS_SHORT[d.getUTCMonth()]} ${year}`;
  }
  return `${day} ${MONTHS_SHORT[d.getUTCMonth()]} ${year}`;
}

export function formatDateRange(checkIn: string, checkOut: string): string {
  const a = parseDate(checkIn);
  const b = parseDate(checkOut);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
  if (sameMonth) {
    return `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS_SHORT[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
  }
  return `${formatDate(checkIn)} – ${formatDate(checkOut)}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${String(
    d.getUTCHours(),
  ).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso.slice(0, 10));
}

export function monthKey(date: string): string {
  return toDateOnly(date).slice(0, 7);
}

export function monthLabel(key: string, style: "short" | "long" = "short"): string {
  const [year, month] = key.split("-");
  const name = MONTHS[Number(month) - 1] ?? "";
  return style === "long" ? `${name} ${year}` : `${name.slice(0, 3)} ${year.slice(2)}`;
}

export interface CalendarWeek {
  days: { date: string; inMonth: boolean }[];
}

/** Monday-first calendar grid for a month, as ISO date strings. */
export function calendarGrid(year: number, month: number): CalendarWeek[] {
  const first = new Date(Date.UTC(year, month, 1));
  const startOffset = (first.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month, 1 - startOffset));
  const weeks: CalendarWeek[] = [];
  for (let w = 0; w < 6; w += 1) {
    const days: CalendarWeek["days"] = [];
    for (let d = 0; d < 7; d += 1) {
      const date = new Date(start.getTime() + (w * 7 + d) * DAY_MS);
      days.push({
        date: date.toISOString().slice(0, 10),
        inMonth: date.getUTCMonth() === month,
      });
    }
    weeks.push({ days });
  }
  return weeks;
}

export function monthName(month: number): string {
  return MONTHS[month] ?? "";
}

export function nextMonths(count: number, from = todayISO()): string[] {
  return Array.from({ length: count }, (_, i) => addMonths(from.slice(0, 7) + "-01", i));
}
