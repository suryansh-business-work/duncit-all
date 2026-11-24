import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { outboundFetch } from '@utils/outboundFetch';
import { cachedSearch, configError, upstreamError } from './reel.library';
import type { ReelMediaItem, ReelMediaPage } from './reel.stock';

/**
 * Music for reels from Jamendo's API (Tech portal → Jamendo client id).
 *
 * A reel is marketing, so only tracks whose Creative Commons licence allows
 * commercial use and adaptation are listed: NonCommercial and NoDerivatives
 * tracks are asked away in the request AND checked again on the licence each
 * track carries, since a track laid under a reel is used commercially and cut
 * to its length. Every listed track keeps its licence link and the credit its
 * licence requires, and a pick is copied into the media store
 * (reel.library.ts) from the track's download address, re-read from Jamendo
 * by its id — never from what the browser sent.
 */

const API = 'https://api.jamendo.com/v3.0/tracks/';

export interface JamendoTrack {
  id: string;
  name?: string;
  artist_name?: string;
  duration?: number;
  image?: string;
  audio?: string;
  audiodownload?: string;
  audiodownload_allowed?: boolean;
  license_ccurl?: string;
}

interface JamendoAnswer {
  headers?: { status?: string; error_message?: string };
  results?: JamendoTrack[];
}

const whole = (value: number | null | undefined): number => Math.max(0, Math.round(value ?? 0));

/** A licence a marketing reel may use: Creative Commons with neither NonCommercial nor NoDerivatives. */
export function commercialLicence(url: string | undefined): boolean {
  const path = (url ?? '').toLowerCase();
  if (!path.includes('creativecommons.org/')) return false;
  // The licence slug names its restrictions: by-nc-sa, by-nd, …
  return !/-n[cd](?=[-/]|$)/.test(path);
}

/** "CC BY-SA 3.0 — https://…" out of the licence link Jamendo gives. */
export function licenceLine(url: string): string {
  const match = /licenses\/([a-z-]+)\/([\d.]+)/i.exec(url);
  const name = match ? `CC ${match[1].toUpperCase()} ${match[2]}` : 'Creative Commons';
  return `${name} — ${url}`.slice(0, 200);
}

export const trackCredit = (track: JamendoTrack): string =>
  `"${track.name || 'Untitled'}" by ${track.artist_name || 'unknown artist'} on Jamendo`.slice(0, 200);

/** Whether a track may be laid under a reel at all. */
export const usableTrack = (track: JamendoTrack): boolean =>
  Boolean(track.audiodownload_allowed && track.audiodownload && commercialLicence(track.license_ccurl));

async function ask(params: URLSearchParams): Promise<JamendoTrack[]> {
  const clientId = (await getRuntimeEnvValue('JAMENDO_CLIENT_ID')).trim();
  if (!clientId) throw configError('Jamendo', 'JAMENDO');
  return cachedSearch(`reel:jamendo:${params.toString()}`, async () => {
    params.set('client_id', clientId);
    const res = await outboundFetch('Jamendo', `${API}?${params.toString()}`);
    const json = (await res.json().catch(() => ({}))) as JamendoAnswer;
    if (!res.ok || json.headers?.status === 'failed') {
      throw upstreamError('Jamendo', json.headers?.error_message || `${res.status} ${res.statusText}`);
    }
    return Array.isArray(json.results) ? json.results : [];
  });
}

const baseParams = (): URLSearchParams =>
  new URLSearchParams({ format: 'json', include: 'licenses', audioformat: 'mp32', ccnc: 'false', ccnd: 'false' });

function trackItem(track: JamendoTrack): ReelMediaItem {
  return {
    id: `jamendo-${track.id}`,
    kind: 'AUDIO',
    // The stream, so the picker can play it before anything is imported.
    url: track.audio || track.audiodownload || '',
    preview_url: track.image ?? '',
    width: 0,
    height: 0,
    duration_ms: whole(track.duration) * 1000,
    licence: licenceLine(track.license_ccurl ?? ''),
    attribution: trackCredit(track),
    provider_id: String(track.id),
    provider: 'JAMENDO',
  };
}

/** Tracks for a search, the ones a reel may not use left out. */
export async function searchJamendo(input: { query: string; page: number; perPage: number }): Promise<ReelMediaPage> {
  const params = baseParams();
  params.set('search', input.query);
  params.set('limit', String(input.perPage));
  params.set('offset', String((input.page - 1) * input.perPage));
  const tracks = await ask(params);
  return { items: tracks.filter(usableTrack).map(trackItem), has_more: tracks.length === input.perPage };
}

/** One track as Jamendo describes it now, or null when it is gone. */
export async function jamendoTrack(id: string): Promise<JamendoTrack | null> {
  const params = baseParams();
  params.set('id', id);
  const [track] = await ask(params);
  return track ?? null;
}
