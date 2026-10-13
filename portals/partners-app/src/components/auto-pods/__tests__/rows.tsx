import type { ReactElement } from 'react';
import { renderWithProviders } from '../../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../../__tests__/groupC-link';

type Over = Record<string, unknown>;

/** One Auto Pod as every queue document selects it. */
export const autoPod = (over: Over = {}) => ({
  __typename: 'AutoPod',
  id: 'ap1',
  auto_pod_no: 'DUN-AP-001',
  stage: 'OPEN',
  is_active: true,
  pod_title: 'Sunday Badminton',
  pod_description: 'Doubles, all levels.',
  pod_images_and_videos: [],
  sub_category_id: 'sub1',
  category_name: 'Badminton',
  pod_mode: 'PHYSICAL',
  pod_amount: 250,
  no_of_spots: 8,
  viewer_claimed: false,
  pod_id: null,
  expected_host_earnings: 1400,
  expected_venue_earnings: 900,
  expected_club_earnings: 300,
  expires_at: null,
  withdraw_penalty_points: 5,
  venue_claim: null,
  host_claim: null,
  club_claim: null,
  location: null,
  ...over,
});

export const venueClaim = {
  __typename: 'AutoPodVenueClaim',
  venue_id: 'v1',
  venue_slot_id: 's1',
  owner_user_id: 'u9',
  venue_name: 'Court House',
  pod_date_time: '2026-08-02T10:00:00.000Z',
  pod_end_date_time: '2026-08-02T12:00:00.000Z',
  slot_price: 800,
  accepted_at: '2026-07-20T10:00:00.000Z',
};

export const hostClaim = { __typename: 'AutoPodHostClaim', user_id: 'u1', host_name: 'Asha', assigned_at: '2026-07-21T10:00:00.000Z' };

export const clubClaim = {
  __typename: 'AutoPodClubClaim',
  club_id: 'club1',
  club_name: 'Smash Club',
  user_id: 'u1',
  claimed_at: '2026-07-22T10:00:00.000Z',
};

/** Mounts an Auto Pod page with the named operations answered. */
export function mountQueue(ui: ReactElement, answers: Record<string, ScriptedAnswer>, sent: SentOperation[] = []) {
  return renderWithProviders(ui, {
    route: '/auto-pods',
    link: scriptedLink({ AdminLocations: { locations: [] }, AutoPodLocations: { locations: [] }, ...answers }, sent),
  });
}
