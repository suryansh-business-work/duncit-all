/**
 * Shared shapes + derivations behind the two partner-studio pod sections
 * (Venue Studio → "Pods hosted on your Venue", Club Studio → "Your Pods").
 *
 * Pure and framework-free so the section, the figures strip and the row all
 * read the SAME numbers, and so the club's server-computed summary and the
 * venue's locally-derived one are the same object to every renderer.
 */

/** The bucket enum both queries return (server: VenuePodBucket). */
export type StudioPodBucket = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

/**
 * The row fields VenuePod and ClubPod share — everything the row renders. Both
 * generated types satisfy it structurally, so neither screen needs a mapper.
 */
export interface StudioPod {
  id: string;
  pod_title: string;
  pod_date_time: string;
  pod_end_date_time?: string | null;
  pod_amount: number;
  pod_type: string;
  no_of_spots: number;
  /** Seats taken — attendees plus the extra seats they bought. */
  attendee_count: number;
  /** Attendee user ids; its length is the PEOPLE count (extra seats excluded). */
  pod_attendees: readonly string[];
  host_names: readonly string[];
  bucket: string;
}

/**
 * The figures strip. Field-for-field the server's ClubPodSummary, so the club
 * section passes it straight through and the venue section derives the same
 * shape from its list — the two studios can never show different arithmetic.
 */
export interface StudioPodFiguresData {
  /** Venues (Venue Studio) or clubs (Club Studio) in scope. */
  scope: number;
  total: number;
  upcoming: number;
  ongoing: number;
  completed: number;
  cancelled: number;
  /** Capacity across non-cancelled pods. */
  total_spots: number;
  /** Seats taken across non-cancelled pods. */
  filled_spots: number;
  /** People in those pods — extra seats excluded. */
  total_attendees: number;
  /** filled_spots / total_spots, 0..1. */
  fill_rate: number;
  next_pod_date_time: string | null;
  /** Collected money; null on a surface the server exposes no revenue for. */
  total_revenue: number | null;
  /** Server-provided symbol; null falls back to the formatter's default. */
  currency_symbol: string | null;
}

export const EMPTY_STUDIO_FIGURES: StudioPodFiguresData = {
  scope: 0,
  total: 0,
  upcoming: 0,
  ongoing: 0,
  completed: 0,
  cancelled: 0,
  total_spots: 0,
  filled_spots: 0,
  total_attendees: 0,
  fill_rate: 0,
  next_pod_date_time: null,
  total_revenue: null,
  currency_symbol: null,
};

/** Localization keys for the four buckets — literal keys, one per value, so the
 * shipped-key gate can see every one of them (rule 38). */
const BUCKET_LABEL_KEYS: Record<StudioPodBucket, string> = {
  UPCOMING: 'mweb.studioPods.bucketUpcoming',
  ONGOING: 'mweb.studioPods.bucketLive',
  COMPLETED: 'mweb.studioPods.bucketPast',
  CANCELLED: 'mweb.studioPods.bucketCancelled',
};

/** Chip colour per bucket — theme tokens, so both themes stay legible. */
const BUCKET_TONES: Record<StudioPodBucket, string> = {
  UPCOMING: '$primary',
  ONGOING: '$success',
  COMPLETED: '$muted',
  CANCELLED: '$danger',
};

const isBucket = (value: string): value is StudioPodBucket => value in BUCKET_LABEL_KEYS;

/** Copy key for a pod's state chip. */
export function bucketLabelKey(bucket: string): string {
  return isBucket(bucket) ? BUCKET_LABEL_KEYS[bucket] : BUCKET_LABEL_KEYS.UPCOMING;
}

/** Chip colour token for a pod's state. */
export function bucketTone(bucket: string): string {
  return isBucket(bucket) ? BUCKET_TONES[bucket] : BUCKET_TONES.UPCOMING;
}

const countOf = (pods: readonly StudioPod[], bucket: StudioPodBucket): number =>
  pods.filter((pod) => pod.bucket === bucket).length;

/** Soonest upcoming start, ISO — null when nothing is scheduled. */
function nextPodDateTime(pods: readonly StudioPod[]): string | null {
  return pods
    .filter((pod) => pod.bucket === 'UPCOMING' && !!pod.pod_date_time)
    .reduce<string | null>((soonest, pod) => {
      if (!soonest) return pod.pod_date_time;
      return new Date(pod.pod_date_time) < new Date(soonest) ? pod.pod_date_time : soonest;
    }, null);
}

/**
 * The venue side's summary, derived from its own list.
 *
 * Every rule here is the server's ClubPodSummary rule: cancelled pods count
 * only in `cancelled` — their spots were never sold — so capacity, fill and
 * attendees are measured over the non-cancelled pods alone. Revenue stays null
 * because no pod field carries collected money.
 */
export function summariseStudioPods(
  pods: readonly StudioPod[],
  scope: number,
): StudioPodFiguresData {
  const live = pods.filter((pod) => pod.bucket !== 'CANCELLED');
  const totalSpots = live.reduce((sum, pod) => sum + pod.no_of_spots, 0);
  const filledSpots = live.reduce((sum, pod) => sum + pod.attendee_count, 0);
  return {
    scope,
    total: pods.length,
    upcoming: countOf(pods, 'UPCOMING'),
    ongoing: countOf(pods, 'ONGOING'),
    completed: countOf(pods, 'COMPLETED'),
    cancelled: countOf(pods, 'CANCELLED'),
    total_spots: totalSpots,
    filled_spots: filledSpots,
    total_attendees: live.reduce((sum, pod) => sum + pod.pod_attendees.length, 0),
    fill_rate: totalSpots > 0 ? filledSpots / totalSpots : 0,
    next_pod_date_time: nextPodDateTime(pods),
    total_revenue: null,
    currency_symbol: null,
  };
}
