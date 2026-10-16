/**
 * Recurring pods — the rules both apps' Create Pod steppers share (rule 40).
 *
 * A host picks the first date (a venue slot, or a virtual window), how often it
 * repeats and the last day it may run. The SERVER works out every date and its
 * slot (`podSeriesPreview`) and creates one real pod per date; this module only
 * words the choices and builds the plan the server is asked about.
 */

export type PodSeriesFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY';

export type PodSeriesSkipReason = 'NO_SLOT' | 'HOLIDAY' | 'TAKEN' | 'REMOVED_BY_HOST' | 'FAILED';

/** The repeat choices, in the order the picker offers them. */
export const POD_SERIES_FREQUENCIES: readonly { value: PodSeriesFrequency; labelKey: string }[] = [
  { value: 'DAILY', labelKey: 'mweb.podSeries.daily' },
  { value: 'WEEKLY', labelKey: 'mweb.podSeries.weekly' },
  { value: 'BIWEEKLY', labelKey: 'mweb.podSeries.biweekly' },
];

/** Why a date cannot run, as the preview list says it. */
export const POD_SERIES_SKIP_REASON_KEY: Record<PodSeriesSkipReason, string> = {
  NO_SLOT: 'mweb.podSeries.reasonNoSlot',
  HOLIDAY: 'mweb.podSeries.reasonHoliday',
  TAKEN: 'mweb.podSeries.reasonTaken',
  REMOVED_BY_HOST: 'mweb.podSeries.reasonRemoved',
  FAILED: 'mweb.podSeries.reasonFailed',
};

const isClockPart = <K extends string>(type: string, parts: Record<K, number>): type is K => type in parts;

/** How far `timeZone` is ahead of UTC at `at`, in ms. An unknown zone (the
 * admin's box is free text) reads as UTC rather than throwing. */
function zoneOffsetMs(at: Date, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(at);
    const p = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 };
    for (const part of parts) if (isClockPart(part.type, p)) p[part.type] = Number(part.value);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return asUtc - Math.floor(at.getTime() / 1000) * 1000;
  } catch {
    return 0;
  }
}

/**
 * The last moment of calendar day `ymd` (`yyyy-MM-dd`) in `timeZone`, as an ISO
 * instant — what the server reads as "the series may run until this day".
 * Null for a value that is not a calendar day.
 */
export function endOfDayInZone(ymd: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return null;
  const wall = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59, 999);
  return new Date(wall - zoneOffsetMs(new Date(wall), timeZone)).toISOString();
}

/** What `podSeriesPreview` and `publishPodDraftSeries` are asked about. */
export interface PodSeriesPlan {
  pod_mode: string;
  venue_id: string | null;
  venue_slot_id: string | null;
  pod_date_time: string | null;
  pod_end_date_time: string | null;
  frequency: PodSeriesFrequency;
  ends_on: string;
  skip_dates: string[];
}

export interface PodSeriesPlanSource {
  repeat_enabled: boolean;
  repeat_frequency: PodSeriesFrequency;
  /** The last day the series may run, `yyyy-MM-dd`. */
  repeat_ends_on: string;
  repeat_skip_dates: readonly string[];
  pod_mode: string;
  venue_id: string;
  venue_slot_id: string;
  pod_date_time: string | null;
  pod_end_date_time: string | null;
}

/**
 * The plan for a form, or null while there is none to ask about: repeat is
 * off, the end day is missing, or the first date is not chosen yet (a slot for
 * a physical pod, a start for a virtual one).
 */
export function buildPodSeriesPlan(source: PodSeriesPlanSource, timeZone: string): PodSeriesPlan | null {
  if (!source.repeat_enabled) return null;
  const endsOn = endOfDayInZone(source.repeat_ends_on, timeZone);
  if (!endsOn) return null;
  const physical = source.pod_mode !== 'VIRTUAL';
  if (physical ? !source.venue_slot_id : !source.pod_date_time) return null;
  return {
    pod_mode: physical ? 'PHYSICAL' : 'VIRTUAL',
    venue_id: physical ? source.venue_id || null : null,
    venue_slot_id: physical ? source.venue_slot_id : null,
    pod_date_time: physical ? null : source.pod_date_time,
    pod_end_date_time: physical ? null : source.pod_end_date_time,
    frequency: source.repeat_frequency,
    ends_on: endsOn,
    skip_dates: [...source.repeat_skip_dates],
  };
}

/**
 * The preview and publish documents, as SDL strings — mWeb wraps them with
 * Apollo's `gql`; the native app re-declares them inline for its codegen.
 */
export const POD_SERIES_PREVIEW_SDL = `
  query PodSeriesPreview($input: PodSeriesPlanInput!) {
    podSeriesPreview(input: $input) {
      frequency
      max_occurrences
      max_span_days
      dates {
        start_at
        end_at
        slot_id
        price
        available
        reason
      }
    }
  }
`;

export const PUBLISH_POD_DRAFT_SERIES_SDL = `
  mutation PublishPodDraftSeries($draft_id: ID!, $input: CreatePodInput!, $plan: PodSeriesPlanInput!) {
    publishPodDraftSeries(draft_id: $draft_id, input: $input, plan: $plan) {
      series_id
      created_count
      skipped {
        date
        reason
      }
    }
  }
`;

/** Venue owner: accept or decline every still-pending date of a series. */
export const VENUE_DECIDE_POD_SERIES_SDL = `
  mutation VenueDecidePodSeries($series_id: ID!, $approve: Boolean!, $reason: String) {
    venueDecidePodSeries(series_id: $series_id, approve: $approve, reason: $reason) {
      decided
      failed
    }
  }
`;

/** A venue request row, as far as grouping needs it. */
export interface SeriesGroupable {
  series_id?: string | null;
  start_at: string;
}

export type SlotRequestGroup<T extends SeriesGroupable> =
  | { kind: 'SINGLE'; key: string; row: T }
  | { kind: 'SERIES'; key: string; seriesId: string; rows: T[] };

/**
 * A venue's pending requests with every recurring series folded into one
 * group (its dates in order), so the venue can answer the whole series at once
 * or each date on its own. A series with a single pending date left reads as
 * an ordinary request. Groups keep the position of their first row.
 */
export function groupSlotRequestsBySeries<T extends SeriesGroupable>(
  rows: readonly T[],
  keyOf: (row: T) => string
): SlotRequestGroup<T>[] {
  const bySeries = new Map<string, T[]>();
  for (const row of rows) {
    if (row.series_id) bySeries.set(row.series_id, [...(bySeries.get(row.series_id) ?? []), row]);
  }
  const out: SlotRequestGroup<T>[] = [];
  const placed = new Set<string>();
  for (const row of rows) {
    const seriesRows = bySeries.get(row.series_id ?? '') ?? [];
    if (seriesRows.length < 2) {
      out.push({ kind: 'SINGLE', key: keyOf(row), row });
      continue;
    }
    const seriesId = String(row.series_id);
    if (placed.has(seriesId)) continue;
    placed.add(seriesId);
    const ordered = [...seriesRows].sort((x, y) => x.start_at.localeCompare(y.start_at));
    out.push({ kind: 'SERIES', key: `series-${seriesId}`, seriesId, rows: ordered });
  }
  return out;
}
