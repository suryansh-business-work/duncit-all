import { urlConfigs } from '../../config/url-configs';

/** Base URL of the public REST API (the GraphQL host without /graphql). */
export const API_BASE = `${urlConfigs.graphqlUrl.replace(/\/graphql$/, '')}/api/v1`;

export interface ApiParam {
  name: string;
  where: 'path' | 'query' | 'body';
  required: boolean;
  description: string;
}

export interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  scope: string;
  title: string;
  description: string;
  params: ApiParam[];
  sampleResponse: string;
}

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: 'list-venues',
    method: 'GET',
    path: '/venues',
    scope: 'venues:read',
    title: 'List venues',
    description: 'All approved, active venues with their public profile (no owner or financial data).',
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
    title: 'Get a venue',
    description: 'One venue by id. 404 when the venue is not approved or does not exist.',
    params: [{ name: 'venueId', where: 'path', required: true, description: 'Venue id from List venues.' }],
    sampleResponse: `{ "venue": { "id": "6650f2…", "venue_name": "Skyline Hall", "city": "Pune" } }`,
  },
  {
    id: 'venue-slots',
    method: 'GET',
    path: '/venues/{venueId}/slots',
    scope: 'slots:read',
    title: 'Slot availability',
    description:
      'Available (bookable) future slots for a venue — holiday-filtered, capped at 500. Optionally bound with from/to ISO timestamps.',
    params: [
      { name: 'venueId', where: 'path', required: true, description: 'Venue id.' },
      { name: 'from', where: 'query', required: false, description: 'ISO start bound (inclusive).' },
      { name: 'to', where: 'query', required: false, description: 'ISO end bound (exclusive).' },
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
    title: 'Book a slot',
    description:
      'Atomically books an AVAILABLE slot for your key. 409 slot_unavailable when it was already taken. Pass your own reference in external_ref.',
    params: [
      { name: 'venueId', where: 'path', required: true, description: 'Venue id.' },
      { name: 'slotId', where: 'path', required: true, description: 'Slot id from Slot availability.' },
      { name: 'external_ref', where: 'body', required: false, description: 'Your booking reference (max 120 chars).' },
    ],
    sampleResponse: `{ "booking": { "id": "6659ab…", "status": "BOOKED", "external_ref": "order-1042" } }`,
  },
  {
    id: 'cancel-booking',
    method: 'DELETE',
    path: '/venues/{venueId}/slots/{slotId}/book',
    scope: 'bookings:write',
    title: 'Cancel a booking',
    description:
      'Releases a slot your key booked (keys can only cancel their own bookings). 409 when the slot is not yours or not booked.',
    params: [
      { name: 'venueId', where: 'path', required: true, description: 'Venue id.' },
      { name: 'slotId', where: 'path', required: true, description: 'The booked slot id.' },
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
  const lines = [`curl -X ${endpoint.method} '${url}'`, `  -H 'x-api-key: ${apiKey || 'YOUR_API_KEY'}'`];
  const bodyParams = endpoint.params.filter((p) => p.where === 'body' && values[p.name]?.trim());
  if (bodyParams.length > 0) {
    const body = Object.fromEntries(bodyParams.map((p) => [p.name, values[p.name].trim()]));
    lines.push(`  -H 'Content-Type: application/json'`, `  -d '${JSON.stringify(body)}'`);
  }
  return lines.join(' \\\n');
}
