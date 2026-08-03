import type { VenuePodRow } from '../queries';

/** One venuePods row, shared by every test on this page. */
export const makeVenuePodRow = (over: Partial<VenuePodRow> = {}): VenuePodRow => ({
  id: '1',
  pod_slug: 'yoga',
  pod_title: 'Yoga',
  pod_date_time: '2026-08-10T18:00:00.000Z',
  pod_end_date_time: null,
  pod_amount: 300,
  pod_type: 'PAID',
  no_of_spots: 8,
  attendee_count: 3,
  pod_attendees: ['u1', 'u2', 'u3'],
  host_names: ['Hema Kaur'],
  venue_id: 'v1',
  venue_name: 'Hall A',
  bucket: 'UPCOMING',
  is_active: true,
  completed_at: null,
  cancelled_at: null,
  created_at: '2026-07-01T00:00:00.000Z',
  ...over,
});
