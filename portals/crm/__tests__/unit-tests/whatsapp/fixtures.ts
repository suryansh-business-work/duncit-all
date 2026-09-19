import type { WaConnection, WaExtraction } from '@/pages/tools/whatsapp/whatsappQueries';

/**
 * A WhatsApp extraction job as the server reports it. `__typename` is set
 * because the WA documents select through fragments, and Apollo's cache only
 * matches a fragment against a typed object.
 */
export const extractionJob = (overrides: Partial<WaExtraction> = {}): WaExtraction & { __typename: 'WaExtraction' } => ({
  __typename: 'WaExtraction',
  id: 'job-1',
  status: 'RUNNING',
  phase: 'contacts',
  total: 0,
  processed: 0,
  valid: 0,
  invalid: 0,
  duplicates: 0,
  communities: 0,
  groups: 0,
  leads_created: 0,
  error: null,
  started_at: '2026-09-18T09:00:00.000Z',
  finished_at: null,
  ...overrides,
});

/** The gateway connection record, typed for the same fragment reason. */
export const waConnection = (overrides: Partial<WaConnection> = {}): WaConnection & { __typename: 'WaConnection' } => ({
  __typename: 'WaConnection',
  base_url: 'https://open-wa-server.duncit.com',
  session_id: 'duncit-crm',
  has_api_key: false,
  status: 'DISCONNECTED',
  phone: null,
  last_error: null,
  connected_at: null,
  ...overrides,
});
