export interface DailyPoint {
  date: string;
  count: number;
}

const DAY_MS = 86_400_000;

/** UTC day key, matching the server's `$dateToString` grouping exactly. */
const dayKey = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Expand a sparse series into one point per day.
 *
 * The server only returns days that had clicks. Rendered as-is, three clicks
 * spread over three weeks would draw three bars side by side and read as three
 * consecutive days. Filling the gaps with zeroes is what makes the x-axis mean
 * elapsed time rather than "days we happen to have data for".
 */
export function fillDailySeries(daily: DailyPoint[], days: number, endingOn: Date): DailyPoint[] {
  const counts = new Map(daily.map((point) => [point.date, point.count]));
  const end = Date.parse(`${dayKey(endingOn)}T00:00:00.000Z`);
  return Array.from({ length: days }, (_, index) => {
    const date = dayKey(new Date(end - (days - 1 - index) * DAY_MS));
    return { date, count: counts.get(date) ?? 0 };
  });
}

/**
 * A y-axis that lands on readable numbers. A max of 47 gives ticks at 0/20/40/60
 * rather than 0/15.7/31.3/47, which is what dividing the raw peak produces.
 */
export function niceTicks(peak: number, count = 4): number[] {
  const step = niceStep(Math.max(1, peak) / count);
  const top = step * count;
  return Array.from({ length: count + 1 }, (_, index) => top - index * step);
}

/**
 * Denser than the usual 1/2/5 ladder on purpose: with only four ticks, 1/2/5
 * leaves a lot of empty axis — a peak of 230 would top out at 400. The extra
 * rungs keep the tallest bar near the top of the plot.
 *
 * Integer steps only: these are click counts, and an axis reading 0.5 / 1 / 1.5
 * is nonsense for whole things.
 */
const STEP_LADDER = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

function niceStep(rough: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(rough, 1)));
  // The ladder's last rung is 10x the magnitude, which is >= rough for every
  // input by construction, so a fit always exists — hence the assertion rather
  // than a fallback that could never run.
  return STEP_LADDER.map((rung) => rung * magnitude).find(
    (step) => Number.isInteger(step) && step >= rough,
  )!;
}
