import {
  mwebAutoPodLabels,
  type AutoPodClubClaim,
  type AutoPodHostClaim,
  type AutoPodLocation,
  type AutoPodRow,
  type AutoPodVenueClaim,
} from '@duncit/utils';

/**
 * Test fixtures for the Auto Pod screens: copy that reads back as its key plus
 * any interpolated values, and a row builder with every claim spelled out.
 * Kept out of coverage (see jest.config.js) like the other fixtures here.
 */
export const autoPodTestLabels = mwebAutoPodLabels((key, options) =>
  [key, ...Object.values(options?.vars ?? {})].join('|'),
);

export const autoPodLocation: AutoPodLocation = {
  location_id: 'blr',
  location_name: 'Bengaluru',
  country: 'India',
  state: 'Karnataka',
  city: 'Bengaluru',
  bound_by: 'VENUE',
  bound_at: '2030-01-01T00:00:00.000Z',
};

export const venueClaim: AutoPodVenueClaim = {
  venue_id: 'v1',
  venue_slot_id: 'slot1',
  owner_user_id: 'owner1',
  venue_name: 'Court Nine',
  pod_date_time: '2030-01-06T10:00:00.000Z',
  pod_end_date_time: '2030-01-06T12:00:00.000Z',
  slot_price: 1200,
  accepted_at: '2030-01-01T00:00:00.000Z',
};

export const hostClaim: AutoPodHostClaim = {
  user_id: 'h1',
  host_name: 'Asha Rao',
  assigned_at: '2030-01-02T00:00:00.000Z',
};

export const clubClaim: AutoPodClubClaim = {
  club_id: 'c1',
  club_name: 'Runners BLR',
  user_id: 'a1',
  claimed_at: '2030-01-03T00:00:00.000Z',
};

export function makeAutoPodRow(over: Partial<AutoPodRow> = {}): AutoPodRow {
  return {
    id: 'ap1',
    auto_pod_no: 'AP-1',
    stage: 'OPEN',
    pod_title: 'Morning Run',
    pod_description: '',
    pod_images_and_videos: [],
    sub_category_id: 'run',
    pod_amount: 200,
    no_of_spots: 10,
    venue_claim: null,
    host_claim: null,
    club_claim: null,
    location: null,
    viewer_claimed: false,
    ...over,
  };
}
