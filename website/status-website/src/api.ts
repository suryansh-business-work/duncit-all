import type { FlatCatalogue, Locale } from '@duncit/i18n';
import type { GraphqlErrorLike } from '@duncit/captcha';
import { SERVER_BASE } from './config/server';
import type {
  Branding,
  HealthReport,
  HistoryResponse,
  IncidentsResponse,
  ProbeResult,
  ServicesResponse,
  StatusReportInput,
  SummaryResponse,
} from './types';

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', signal });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

export function fetchServices(signal?: AbortSignal): Promise<ServicesResponse> {
  return getJson<ServicesResponse>(`${SERVER_BASE}/status/services`, signal);
}

export function fetchSummary(signal?: AbortSignal): Promise<SummaryResponse> {
  return getJson<SummaryResponse>(`${SERVER_BASE}/status/summary`, signal);
}

export function fetchIncidents(signal?: AbortSignal): Promise<IncidentsResponse> {
  return getJson<IncidentsResponse>(`${SERVER_BASE}/status/incidents`, signal);
}

export function fetchHistory(
  serviceKey: string,
  hours: number,
  signal?: AbortSignal,
): Promise<HistoryResponse> {
  const params = new URLSearchParams({ service: serviceKey, hours: String(hours) });
  return getJson<HistoryResponse>(`${SERVER_BASE}/status/history?${params.toString()}`, signal);
}

export function fetchProbe(url: string, signal?: AbortSignal): Promise<ProbeResult> {
  return getJson<ProbeResult>(
    `${SERVER_BASE}/status/probe?url=${encodeURIComponent(url)}`,
    signal,
  );
}

export function fetchHealth(url: string, signal?: AbortSignal): Promise<HealthReport> {
  return getJson<HealthReport>(url, signal);
}

/**
 * One POST to /graphql. The status page has no Apollo client — it renders
 * before any session exists — so the four documents it needs share this
 * instead of four hand-rolled fetches (rule 34).
 *
 * Returns null on a transport or GraphQL error: every caller here has a
 * fallback that is better than an exception on a page whose entire job is to
 * still be readable when things are broken.
 */
async function postGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<GraphqlPayload<T> | null> {
  const res = await fetch(`${SERVER_BASE}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal,
  });
  if (!res.ok) return null;
  return (await res.json()) as GraphqlPayload<T>;
}

interface GraphqlPayload<T> {
  data?: T | null;
  errors?: GraphqlErrorLike[];
}

async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T | null> {
  const json = await postGraphql<T>(query, variables, signal);
  if (!json) return null;
  if (json.errors?.length) throw new Error(json.errors[0]?.message ?? 'Request failed');
  return json.data ?? null;
}

/** Live brand (logo, name, accent) from admin settings — same query the old site used. */
export async function fetchBranding(signal?: AbortSignal): Promise<Branding | null> {
  const data = await graphqlRequest<{ branding?: Branding }>(
    '{ branding { app_name logo_url primary_color } }',
    undefined,
    signal,
  );
  return data?.branding ?? null;
}

const LOCALES_QUERY = '{ publicLocales { code label is_rtl is_active is_default } }';

/** Active locales, so the page can pick the visitor's language like every other surface. */
export async function fetchLocales(signal?: AbortSignal): Promise<Locale[]> {
  const data = await graphqlRequest<{ publicLocales?: Locale[] }>(
    LOCALES_QUERY,
    undefined,
    signal,
  );
  return data?.publicLocales ?? [];
}

const TRANSLATIONS_QUERY =
  'query PublicTranslations($locale: String!) { publicTranslations(locale: $locale) { key value } }';

/** The admin-managed catalogue for one locale, merged over the bundled fallback. */
export async function fetchTranslations(
  locale: string,
  signal?: AbortSignal,
): Promise<FlatCatalogue> {
  const data = await graphqlRequest<{ publicTranslations?: Array<{ key: string; value: string }> }>(
    TRANSLATIONS_QUERY,
    { locale },
    signal,
  );
  const entries: FlatCatalogue = {};
  for (const row of data?.publicTranslations ?? []) entries[row.key] = row.value;
  return entries;
}

const SUBMIT_REPORT_MUTATION =
  'mutation SubmitStatusReport($input: SubmitStatusReportInput!) {' +
  ' submitStatusReport(input: $input) { ok id } }';

/** Whether it landed, and — when it did not — what the server said about it. */
export interface StatusReportOutcome {
  ok: boolean;
  errors: GraphqlErrorLike[];
}

/**
 * File one problem report. Unauthenticated by design — the visitor this form
 * exists for may be the one who cannot sign in anywhere.
 *
 * The errors come back rather than being thrown, because one of them is
 * routine: a mistyped verification code is answered by the captcha widget
 * itself, not by the form's failure banner.
 */
export async function submitStatusReport(
  input: StatusReportInput,
  signal?: AbortSignal,
): Promise<StatusReportOutcome> {
  const json = await postGraphql<{ submitStatusReport?: { ok: boolean } }>(
    SUBMIT_REPORT_MUTATION,
    { input },
    signal,
  );
  return {
    ok: json?.data?.submitStatusReport?.ok === true,
    errors: json?.errors ?? [],
  };
}
