import { SERVER_BASE } from './config/server';
import type {
  Branding,
  HealthReport,
  HistoryResponse,
  IncidentsResponse,
  ProbeResult,
  ServicesResponse,
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

/** Live brand (logo, name, accent) from admin settings — same query the old site used. */
export async function fetchBranding(signal?: AbortSignal): Promise<Branding | null> {
  const res = await fetch(`${SERVER_BASE}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{ branding { app_name logo_url primary_color } }' }),
    signal,
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: { branding?: Branding } };
  return json?.data?.branding ?? null;
}
