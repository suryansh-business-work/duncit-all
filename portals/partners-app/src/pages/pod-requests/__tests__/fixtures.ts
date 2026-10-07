/**
 * Pod Request data as the server answers it, typename and all — Apollo drops
 * an object it cannot write whole, so every nested object carries its own.
 */

export const venueSummary = (over: Record<string, unknown> = {}) => ({
  __typename: 'PartnerVenueSummary',
  id: 'venue-1',
  venue_name: 'Courtside Arena',
  category: 'Badminton',
  venue_type: 'Indoor',
  capacity: 40,
  locality: 'Indiranagar',
  city: 'Bengaluru',
  cover_image_url: '',
  ...over,
});

export const hostSummary = (over: Record<string, unknown> = {}) => ({
  __typename: 'PartnerHostSummary',
  user_id: 'host-user-1',
  name: 'Kiran Shah',
  photo_url: '',
  categories: ['Badminton', 'Yoga'],
  ...over,
});

/** One row of `myPodPartnerRequests` — the list query's fields only. */
export const requestRow = (over: Record<string, unknown> = {}) => {
  const venue = venueSummary();
  const host = hostSummary();
  return {
    __typename: 'PodPartnerRequest',
    id: 'req-1',
    direction: 'VENUE_TO_HOST',
    status: 'REQUESTED',
    viewer_side: 'HOST',
    created_at: '2026-10-01T10:00:00.000Z',
    venue: {
      __typename: venue.__typename,
      id: venue.id,
      venue_name: venue.venue_name,
      locality: venue.locality,
      city: venue.city,
      cover_image_url: venue.cover_image_url,
    },
    host: { __typename: host.__typename, user_id: host.user_id, name: host.name, photo_url: host.photo_url },
    ...over,
  };
};

export const requestSlot = (over: Record<string, unknown> = {}) => ({
  __typename: 'PartnerRequestSlot',
  id: 'slot-1',
  start_at: '2026-10-10T12:30:00.000Z',
  end_at: '2026-10-10T14:30:00.000Z',
  whole_day: false,
  space_label: 'Court 2',
  ...over,
});

/** `podPartnerRequest` — the detail query's fields. */
export const requestDetail = (over: Record<string, unknown> = {}) => ({
  __typename: 'PodPartnerRequest',
  id: 'req-1',
  direction: 'VENUE_TO_HOST',
  status: 'REQUESTED',
  viewer_side: 'HOST',
  note: null,
  distance_km: 2.5,
  pod_id: null,
  created_at: '2026-10-01T10:00:00.000Z',
  venue: venueSummary(),
  host: hostSummary(),
  slot: null,
  contact: null,
  ...over,
});

export const venueSlot = (over: Record<string, unknown> = {}) => ({
  __typename: 'VenueSlot',
  id: 'open-1',
  start_at: '2026-10-12T12:30:00.000Z',
  end_at: '2026-10-12T14:30:00.000Z',
  whole_day: false,
  price: 800,
  space_label: '',
  ...over,
});

export const quota = (limit: number, remaining: number) => ({
  podPartnerRequestQuota: { __typename: 'PartnerRequestQuota', limit, remaining },
});

export const category = (id: string, name: string) => ({
  __typename: 'Category',
  id,
  name,
  slug: id,
  level: 'CATEGORY',
  parent_id: 'super-1',
  min_pax: null,
});
