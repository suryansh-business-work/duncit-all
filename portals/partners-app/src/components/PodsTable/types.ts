import type { MutableRefObject, ReactNode } from 'react';
import type { TableFetch } from '@duncit/table';

/** Minimal row shape shared by the partner + club-admin pods tables. */
export interface PodRowBase {
  id: string;
  pod_title: string;
  club_id?: string | null;
  venue_id?: string | null;
  pod_mode?: string | null;
  pod_date_time?: string | null;
  pod_amount?: number | null;
  pod_attendees?: string[] | null;
  /** Seats held — attendees plus every extra seat a multi-seat booking bought. */
  seats_taken?: number | null;
  /** Declared capacity, when the query selected it. 0/absent = uncapped. */
  no_of_spots?: number | null;
  /** Seats scanned in at the door — what a completed pod settles on. */
  attendance?: { attended_seats: number; booked_seats: number; recorded: boolean } | null;
  is_active: boolean;
  completed_at?: string | null;
  /** Optional booking-cycle state — the club-admin list shows every stage, the
   * host list does not select them. */
  is_deleted?: boolean | null;
  venue_approval_status?: string | null;
}

export interface Props<T extends PodRowBase> {
  tableId: string;
  fetchRows: TableFetch<T>;
  refetchRef?: MutableRefObject<(() => void) | null>;
  venueName: (id?: string | null) => string;
  /** When provided, the club name renders as a caption under the pod title. */
  clubName?: (id: string) => string;
  emptyText: string;
  toolbarActions?: ReactNode;
  /** When provided, a trailing Actions column renders this per row. */
  renderActions?: (pod: T) => ReactNode;
  /** Width of that column. The host list renders one overflow menu; the
   * club-admin list renders four icon buttons and needs the room. */
  actionsWidth?: number;
  /** When provided, an "AI Monitoring" column renders this per row — the
   * club-admin list passes the activity-dialog pill; the host list does not. */
  renderMonitor?: (pod: T) => ReactNode;
}
