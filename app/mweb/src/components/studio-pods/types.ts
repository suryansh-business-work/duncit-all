/**
 * The ONE pod shape both partner studios render (rule 34/40).
 *
 * `venuePods` and `myClubPods` are field-for-field identical apart from the
 * owning venue/club, so each query ALIASES that pair to `owner_id`/`owner_name`
 * and both studios feed the same row + figures components. A second shape here
 * is exactly how the two sections would drift apart.
 */

/** Lifecycle bucket the server derives (VenuePodBucket in the SDL). */
export type StudioPodBucket = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

export interface StudioPod {
  id: string;
  pod_slug: string;
  pod_title: string;
  pod_date_time: string;
  pod_end_date_time: string | null;
  pod_amount: number;
  pod_type: 'FREE' | 'PAID';
  no_of_spots: number;
  /** Seats taken — attendees plus the extra seats they bought. */
  attendee_count: number;
  /** Attendee user ids; its length is the head-count without extra seats. */
  pod_attendees: string[];
  host_names: string[];
  /** The owning venue (Venue Studio) or club (Club Studio). */
  owner_id: string;
  owner_name: string;
  bucket: StudioPodBucket;
  is_active: boolean;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

/**
 * Roll-up behind the figures strip. Club Studio receives it from the server
 * (`myClubPodsSummary`, computed over every pod rather than the capped list);
 * Venue Studio derives the same shape from its list, because every figure but
 * revenue is derivable from a pod row.
 */
export interface StudioPodSummary {
  /** Venues (Venue Studio) or clubs (Club Studio) the figures cover. */
  scope_count: number;
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
  /** Collected revenue — null when the surface exposes no revenue query. */
  total_revenue: number | null;
  currency_symbol: string;
}
