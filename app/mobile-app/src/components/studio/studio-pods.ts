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
  /** The venue or club this pod sits under, aliased in both queries so one row
   * type renders both studios (and mWeb shows the same line). */
  owner_name: string;
  bucket: string;
}

/**
 * The figures strip. Field-for-field the server summary that BOTH studios now
 * return, so neither client does arithmetic and the two cannot disagree.
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

/** The server summary shape both studios return (venuePodsSummary /
 * myClubPodsSummary). The roll-up used to be computed here AND in mWeb AND on
 * the server for clubs — three versions of one set of rules, and the two client
 * copies folded the CAPPED list, so a venue past 500 pods reported a total of
 * 500 under a caption promising the figures counted them all. */
export interface StudioPodSummaryResult {
  scope_count: number;
  total: number;
  upcoming: number;
  ongoing: number;
  completed: number;
  cancelled: number;
  total_spots: number;
  filled_spots: number;
  total_attendees: number;
  fill_rate: number;
  next_pod_date_time?: string | null;
  total_revenue: number;
  currency_symbol: string;
}
