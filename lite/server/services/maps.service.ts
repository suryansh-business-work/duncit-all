import { env } from '../config/env';
import { envEntryService, readString } from './envEntry.service';

const PLACES_AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const TIMEOUT_MS = 10_000;

export interface MapsConfig {
  api_key: string;
  map_id: string;
}

/** The active Google Maps entry, or null — the place search and the map then stay off. */
export async function activeMaps(): Promise<MapsConfig | null> {
  const config = await envEntryService.activeConfig('GOOGLE_MAPS');
  const api_key = readString(config, 'api_key');
  return api_key ? { api_key, map_id: readString(config, 'map_id') } : null;
}

/**
 * Prove a browser key the way a visitor's browser would use it: one Places
 * autocomplete call, sent with the site's own address as the referrer so a
 * key restricted to the Lite hostnames still answers.
 */
export async function probeMaps(apiKey: string): Promise<{ ok: boolean; message: string }> {
  if (!apiKey) return { ok: false, message: 'The browser API key is required' };
  try {
    const res = await fetch(PLACES_AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': apiKey, Referer: `${env.siteUrl}/` },
      body: JSON.stringify({ input: 'New Delhi' }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return { ok: true, message: 'Google accepted this key for place search' };
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    return { ok: false, message: `Google refused the key: ${body.error?.message ?? `HTTP ${res.status}`}` };
  } catch (error) {
    return { ok: false, message: `Google could not be reached: ${error instanceof Error ? error.message : String(error)}` };
  }
}
