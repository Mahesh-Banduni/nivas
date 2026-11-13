import { addMonths } from "./date";

/** Last `count` month keys ending with the current month, inclusive. */
export function monthKeysBack(count: number, from = new Date().toISOString().slice(0, 10)): string[] {
  const start = `${from.slice(0, 7)}-01`;
  return Array.from({ length: count }, (_, index) => {
    const offset = index - (count - 1);
    return addMonths(start, offset).slice(0, 7);
  });
}

export function fillSeries(
  rows: Array<{ month: string; value: number | null }>,
  months: string[],
): Array<{ month: string; value: number }> {
  const map = new Map(rows.map((row) => [row.month, Number(row.value ?? 0)]));
  return months.map((month) => ({ month, value: map.get(month) ?? 0 }));
}

export function growth(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}
