import type { ReactElement } from 'react';
import type { PodFinanceWaterfall } from '@duncit/ui';

/** The media a pod carries, as the dialogs read and write it. */
export interface HostPodMedia {
  url: string;
  type: string;
}

/**
 * The pod as the action surface needs it.
 *
 * Deliberately narrow: mWeb reads it off `myHostPods` and the portals read it
 * off a `myHostPodsTable` row, and the two selections are not the same shape.
 * Everything below is present in both.
 */
export interface HostPodTarget {
  id: string;
  pod_title: string;
  pod_description?: string | null;
  pod_images_and_videos?: HostPodMedia[] | null;
  venue_id?: string | null;
  venue_approval_status?: string | null;
}

/** The pod the completion dialog settles. */
export interface HostPodForComplete {
  id: string;
  pod_title: string;
  venue_id?: string | null;
}

/**
 * The media field each surface supplies.
 *
 * The picker is the one part of these dialogs that is genuinely per-surface —
 * mWeb opens its own Pexels-backed picker, a portal opens the ImageKit one —
 * so the package renders whatever the caller hands it rather than pulling a
 * second picker implementation into the shared build.
 */
export interface MediaFieldRenderProps {
  value: string;
  onChange: (text: string) => void;
  error?: string;
  label: string;
  /** Upload destination for the surface's picker. */
  folder?: string;
}

export type RenderMediaField = (props: Readonly<MediaFieldRenderProps>) => ReactElement;

/** One venue a rejected pod can be resubmitted to. */
export interface ResubmitVenueOption {
  id: string;
  venue_name: string;
  city?: string | null;
}

/** One bookable slot at the chosen venue. */
export interface ResubmitSlotOption {
  id: string;
  start_at: string;
  end_at: string;
  price: number;
  space_label: string;
}

/** What deleting a pod means for the people who joined it. */
export interface PodDeleteImpact {
  other_attendee_count: number;
  refundable_payment_count: number;
  refund_total: number;
  currency_symbol: string;
}

/** One booking on the completion roster. Attendance comes from the door scan,
 * so `attended` is true only once a host has scanned that ticket. */
export interface PodSettlementAttendee {
  membership_id: string;
  user_id: string;
  name: string;
  seats: number;
  attended: boolean;
  attended_at: string | null;
  amount: number;
}

/** The settlement preview for one pod, at a given venue bill amount. */
export interface PodSettlement {
  currency_symbol: string;
  collected_total: number;
  has_venue: boolean;
  /** Seats the settlement was computed on — the ones scanned in. */
  paying_attendees: number;
  attended_seats: number;
  booked_seats: number;
  /** Money from the attended bookings: what the payout was computed from. */
  attended_total: number;
  attendees: PodSettlementAttendee[];
  waterfall: PodFinanceWaterfall;
}

/** One scanned attendee — the same shape the native twin renders (rule 27). */
export interface ScannedAttendee {
  user_id: string;
  full_name: string;
  profile_photo: string;
  profile_path: string;
  email: string;
  phone: string;
  whatsapp: string;
  bio: string;
  address: string;
  city: string;
  joined_at: string | null;
}

/** One extra person a multi-seat ticket admits, recorded at the door. */
export interface PodCompanionInput {
  name: string;
  phone_number: string;
}

export interface HostTicketScanResult {
  ok: boolean;
  message: string;
  already_checked_in: boolean;
  /** True when the ticket admits more people whose details are not on file yet. */
  requires_companions: boolean;
  /** How many still need a name and phone number. */
  companions_required: number;
  ticket: {
    id: string;
    ticket_code: string;
    status: string;
    /** People this one QR admits. 1 for every single-seat and legacy ticket. */
    seats: number;
    checked_in_at: string | null;
  } | null;
  attendee: ScannedAttendee | null;
}

/** The pod the ticket scanner is checking people into. */
export interface ScanTarget {
  id: string;
  pod_title: string;
}
