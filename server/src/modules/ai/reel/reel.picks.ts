import { isStockLibraryUrl } from '@utils/url';
import type { IReelProject, ReelAsset, ReelAssetKind } from './reel.model';
import { badInput, mimeFromUrl, shortId, str } from './reel.shared';
import { importLibraryFile, providerOf, type ReelStockProvider } from './reel.library';
import { PIXABAY_LICENCE } from './reel.pixabay';
import { jamendoTrack, licenceLine, trackCredit, usableTrack } from './reel.jamendo';
import { newStockAssets, type ReelStockAssetInput } from './reel.stock';

/**
 * Stock the operator picked, as the reel keeps it. Pexels picks stay pointers
 * (reel.stock.ts); Pixabay and Jamendo picks are copied into the media store
 * one at a time, so a pick of several files never holds them all in memory.
 */

/** Each is a download and an upload; more than this in one call is a request to wait minutes. */
const MAX_IMPORTS_PER_CALL = 6;
const PIXABAY_HOST = /(^|\.)pixabay\.com$/i;
const FALLBACK_MIME: Record<ReelAssetKind, string> = { VIDEO: 'video/mp4', IMAGE: 'image/jpeg', AUDIO: 'audio/mpeg' };

const whole = (value: number | null | undefined): number => Math.max(0, Math.round(value ?? 0));

/** The id a library item is kept under: Pexels ids stay bare, as every older reel has them. */
const storedId = (provider: ReelStockProvider, id: string): string => `${provider.toLowerCase()}:${id}`;

function asset(fields: Pick<ReelAsset, 'kind' | 'name' | 'url' | 'duration_ms' | 'width' | 'height' | 'licence' | 'attribution' | 'provider_id'>): ReelAsset {
  return {
    ...fields,
    id: shortId(),
    source: 'STOCK',
    mime_type: mimeFromUrl(fields.url) || FALLBACK_MIME[fields.kind],
    drive_file_id: '',
    size_bytes: 0,
    added_at: new Date(),
  };
}

async function pixabayAsset(item: ReelStockAssetInput, providerId: string): Promise<ReelAsset> {
  const url = str(item.url);
  if (item.kind === 'AUDIO') throw badInput('Pixabay picks are pictures or clips.');
  if (!isStockLibraryUrl(url) || !PIXABAY_HOST.test(new URL(url).hostname)) {
    throw badInput('A Pixabay pick must come from Pixabay — pick it with the media search.');
  }
  return asset({
    kind: item.kind,
    name: str(item.name).slice(0, 120) || (item.kind === 'VIDEO' ? 'Pixabay clip' : 'Pixabay photo'),
    url: await importLibraryFile(url, 'PIXABAY', providerId),
    duration_ms: item.kind === 'VIDEO' ? whole(item.duration_ms) : 0,
    width: whole(item.width),
    height: whole(item.height),
    licence: PIXABAY_LICENCE,
    attribution: str(item.attribution).slice(0, 200),
    provider_id: storedId('PIXABAY', providerId),
  });
}

/** Re-read from Jamendo by id: the licence, the credit and the file all come from Jamendo, never the browser. */
async function jamendoAsset(providerId: string): Promise<ReelAsset> {
  const track = await jamendoTrack(providerId);
  if (!track?.audiodownload || !usableTrack(track)) {
    throw badInput('That track is gone from Jamendo or its licence no longer allows use in a reel.');
  }
  return asset({
    kind: 'AUDIO',
    name: str(track.name).slice(0, 120) || 'Jamendo track',
    url: await importLibraryFile(track.audiodownload, 'JAMENDO', providerId),
    duration_ms: whole(track.duration) * 1000,
    width: 0,
    height: 0,
    licence: licenceLine(track.license_ccurl ?? ''),
    attribution: trackCredit(track),
    provider_id: storedId('JAMENDO', providerId),
  });
}

/** Every pick the reel does not already hold, imported where the library requires it. */
export async function pickedStockAssets(doc: IReelProject, items: readonly ReelStockAssetInput[]): Promise<ReelAsset[]> {
  const fromPexels = items.filter((item) => providerOf(item.provider) === 'PEXELS');
  const fromLibraries = items.filter((item) => providerOf(item.provider) !== 'PEXELS');
  if (fromLibraries.length > MAX_IMPORTS_PER_CALL) {
    throw badInput(`Add at most ${MAX_IMPORTS_PER_CALL} Pixabay or Jamendo files at a time.`);
  }
  const added = newStockAssets(doc, fromPexels);
  const held = new Set(doc.assets.filter((existing) => existing.source === 'STOCK').map((existing) => `${existing.kind}:${existing.provider_id}`));
  for (const item of fromLibraries) {
    const provider = providerOf(item.provider);
    const providerId = str(item.provider_id);
    if (!providerId) throw badInput('A stock pick has no library id — pick it with the media search.');
    const key = `${provider === 'JAMENDO' ? 'AUDIO' : item.kind}:${storedId(provider, providerId)}`;
    if (held.has(key)) continue;
    held.add(key);
    // One at a time on purpose: each is a whole file in memory while it uploads.
    added.push(provider === 'JAMENDO' ? await jamendoAsset(providerId) : await pixabayAsset(item, providerId));
  }
  return added;
}
