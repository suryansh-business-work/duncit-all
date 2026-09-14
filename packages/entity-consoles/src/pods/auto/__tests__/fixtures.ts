// Shared Auto Pod rows for the enrolled-partner and details-page suites — the
// shapes the admin queries select, carrying real duncit-looking data.
import type { AutoPodClubClaim, AutoPodHostClaim, AutoPodLocation, AutoPodVenueClaim } from '@duncit/utils';
import type { AutoPodDetailsRow, AutoPodTableRow } from '../queries';

export const venueClaim: AutoPodVenueClaim = {
  venue_id: 'ven-4821',
  venue_slot_id: 'slot-77',
  owner_user_id: 'usr-501',
  venue_name: 'Play Arena Koramangala',
  pod_date_time: '2026-09-20T07:00:00.000Z',
  pod_end_date_time: '2026-09-20T09:00:00.000Z',
  slot_price: 1200,
  accepted_at: '2026-09-10T06:30:00.000Z',
};

export const hostClaim: AutoPodHostClaim = {
  user_id: 'usr-902',
  host_name: 'Asha Menon',
  assigned_at: '2026-09-11T08:00:00.000Z',
};

export const clubClaim: AutoPodClubClaim = {
  club_id: 'club-33',
  club_name: 'Bengaluru Badminton Club',
  user_id: 'usr-340',
  claimed_at: '2026-09-12T10:15:00.000Z',
};

export const bengaluru: AutoPodLocation = {
  location_id: 'loc-blr',
  location_name: 'Bengaluru',
  country: 'India',
  state: 'Karnataka',
  city: 'Bengaluru',
  bound_by: 'VENUE',
  bound_at: '2026-09-10T06:30:00.000Z',
};

export const makeAutoPodRow = (over: Partial<AutoPodTableRow> = {}): AutoPodTableRow => ({
  id: 'ap-doc-1',
  auto_pod_no: 'DUN-AP-4821',
  stage: 'CLAIMING',
  is_active: true,
  pod_title: 'Sunday Badminton Doubles',
  pod_description: 'Friendly doubles for intermediate players.',
  pod_info: 'Bring non-marking shoes.',
  pod_hashtag: ['badminton', 'weekend'],
  pod_images_and_videos: [{ url: 'https://ik.imagekit.io/duncit/cover.jpg', type: 'image' }],
  super_category_id: 'sc-sports',
  sub_category_id: 'sub-badminton',
  category_name: 'Badminton',
  category_path: ['Sports', 'Racket', 'Badminton'],
  pod_amount: 499,
  no_of_spots: 12,
  pod_occurrence: 'ONE_TIME',
  pod_mode: 'PHYSICAL',
  payment_terms: null,
  venue_claim: null,
  host_claim: null,
  club_claim: null,
  location: null,
  pod_id: null,
  created_at: '2026-09-09T05:00:00.000Z',
  updated_at: '2026-09-12T10:15:00.000Z',
  ...over,
});

export const makeDetailsRow = (over: Partial<AutoPodDetailsRow> = {}): AutoPodDetailsRow => ({
  ...makeAutoPodRow(),
  reel_url: null,
  meeting_platform: null,
  meeting_url: null,
  meeting_notes: null,
  pod_date_time: null,
  pod_end_date_time: null,
  what_this_pod_offers: ['Shuttles provided'],
  available_perks: ['Free water'],
  cancel_reason: null,
  expires_at: null,
  ...over,
});

/** Echoes the key, and any vars in order, so a test can read what was asked for. */
export const echoT = (key: string, options?: { vars?: Record<string, string | number> }): string =>
  options?.vars ? `${key}(${Object.values(options.vars).join(',')})` : key;

export const formatDateTime = (value: string) => `FMT<${value}>`;
