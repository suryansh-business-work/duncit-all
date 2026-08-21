import { urlConfigs } from '../../config/url-configs';

/** Base URL of the public REST API (the GraphQL host without /graphql). */
export const API_BASE = `${urlConfigs.graphqlUrl.replace(/\/graphql$/, '')}/api/v1`;

/** The auth header every call must carry. Shown in the docs, sent by Try-It. */
export const API_KEY_HEADER = 'x-api-key';

/**
 * The reference is STRUCTURE here and COPY in the shipped bundle (rule 38):
 * paths, methods, scopes, parameter names and JSON samples are what an
 * integrator sends and receives, so they stay verbatim, while every sentence a
 * human reads is addressed by key.
 *
 * The keys are written out as literals rather than derived from `id`, because
 * the build gate greps for literal key strings — a composed key would report
 * all of this as shipped copy that nothing renders.
 */
export interface ApiParam {
  name: string;
  where: 'path' | 'query' | 'body';
  required: boolean;
  descriptionKey: string;
}

export interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  scope: string;
  titleKey: string;
  descriptionKey: string;
  params: ApiParam[];
  sampleResponse: string;
}

/** `venueId` means the same thing on four endpoints — one key, not four. */
const VENUE_ID_PARAM: ApiParam = {
  name: 'venueId',
  where: 'path',
  required: true,
  descriptionKey: 'developers.api.param.venueId',
};

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: 'list-venues',
    method: 'GET',
    path: '/venues',
    scope: 'venues:read',
    titleKey: 'developers.api.listVenues.title',
    descriptionKey: 'developers.api.listVenues.description',
    params: [],
    sampleResponse: `{
  "venues": [
    {
      "id": "6650f2…",
      "venue_name": "Skyline Hall",
      "city": "Pune",
      "state": "Maharashtra",
      "lat": 18.52,
      "lng": 73.85
    }
  ]
}`,
  },
  {
    id: 'get-venue',
    method: 'GET',
    path: '/venues/{venueId}',
    scope: 'venues:read',
    titleKey: 'developers.api.getVenue.title',
    descriptionKey: 'developers.api.getVenue.description',
    params: [
      {
        name: 'venueId',
        where: 'path',
        required: true,
        descriptionKey: 'developers.api.param.venueIdFromList',
      },
    ],
    sampleResponse: `{ "venue": { "id": "6650f2…", "venue_name": "Skyline Hall", "city": "Pune" } }`,
  },
  {
    id: 'venue-slots',
    method: 'GET',
    path: '/venues/{venueId}/slots',
    scope: 'slots:read',
    titleKey: 'developers.api.venueSlots.title',
    descriptionKey: 'developers.api.venueSlots.description',
    params: [
      VENUE_ID_PARAM,
      { name: 'from', where: 'query', required: false, descriptionKey: 'developers.api.param.from' },
      { name: 'to', where: 'query', required: false, descriptionKey: 'developers.api.param.to' },
    ],
    sampleResponse: `{
  "slots": [
    { "id": "6659ab…", "starts_at": "2026-07-10T10:00:00.000Z", "ends_at": "2026-07-10T12:00:00.000Z", "price": 1500, "space_label": "Hall A", "status": "AVAILABLE" }
  ]
}`,
  },
  {
    id: 'book-slot',
    method: 'POST',
    path: '/venues/{venueId}/slots/{slotId}/book',
    scope: 'bookings:write',
    titleKey: 'developers.api.bookSlot.title',
    descriptionKey: 'developers.api.bookSlot.description',
    params: [
      VENUE_ID_PARAM,
      {
        name: 'slotId',
        where: 'path',
        required: true,
        descriptionKey: 'developers.api.param.slotId',
      },
      {
        name: 'external_ref',
        where: 'body',
        required: false,
        descriptionKey: 'developers.api.param.externalRef',
      },
    ],
    sampleResponse: `{ "booking": { "id": "6659ab…", "status": "BOOKED", "external_ref": "order-1042" } }`,
  },
  {
    id: 'cancel-booking',
    method: 'DELETE',
    path: '/venues/{venueId}/slots/{slotId}/book',
    scope: 'bookings:write',
    titleKey: 'developers.api.cancelBooking.title',
    descriptionKey: 'developers.api.cancelBooking.description',
    params: [
      VENUE_ID_PARAM,
      {
        name: 'slotId',
        where: 'path',
        required: true,
        descriptionKey: 'developers.api.param.bookedSlotId',
      },
    ],
    sampleResponse: `{ "released": true }`,
  },
];

/** Substitute {tokens} in an endpoint path with user-entered values. */
export function buildPath(endpoint: ApiEndpoint, values: Record<string, string>): string {
  let path = endpoint.path;
  for (const param of endpoint.params) {
    if (param.where === 'path') path = path.replace(`{${param.name}}`, values[param.name]?.trim() || `{${param.name}}`);
  }
  const query = endpoint.params
    .filter((p) => p.where === 'query' && values[p.name]?.trim())
    .map((p) => `${p.name}=${encodeURIComponent(values[p.name].trim())}`)
    .join('&');
  return query ? `${path}?${query}` : path;
}

/** A copy-pasteable curl for the endpoint with the entered values. */
export function buildCurl(endpoint: ApiEndpoint, values: Record<string, string>, apiKey: string): string {
  const url = `${API_BASE}${buildPath(endpoint, values)}`;
  const lines = [`curl -X ${endpoint.method} '${url}'`, `  -H '${API_KEY_HEADER}: ${apiKey || 'YOUR_API_KEY'}'`];
  const bodyParams = endpoint.params.filter((p) => p.where === 'body' && values[p.name]?.trim());
  if (bodyParams.length > 0) {
    const body = Object.fromEntries(bodyParams.map((p) => [p.name, values[p.name].trim()]));
    lines.push(`  -H 'Content-Type: application/json'`, `  -d '${JSON.stringify(body)}'`);
  }
  return lines.join(' \\\n');
}
