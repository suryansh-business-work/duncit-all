import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';

/**
 * The Google Fonts catalogue for the Design system's font picker.
 *
 * Read from Google's public font metadata (the list fonts.google.com itself
 * renders), so no API key is needed. It is ~1,800 families and changes a few
 * times a month, so it is fetched once and kept in memory for a day; when a
 * refresh fails the last good copy keeps serving rather than the picker going
 * empty.
 */
const METADATA_URL = 'https://fonts.google.com/metadata/fonts';
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_LIMIT = 100;

export interface GoogleFont {
  family: string;
  category: string;
  weights: number[];
  italic: boolean;
  popularity: number;
}

interface MetadataFamily {
  family: string;
  category?: string;
  popularity?: number;
  fonts?: Record<string, unknown>;
}

let cache: { fonts: GoogleFont[]; expires: number } | null = null;
let loading: Promise<GoogleFont[]> | null = null;

/** `{"400": …, "700i": …}` → weights [400, 700], italic true. */
export function variantsOf(fonts: Record<string, unknown> = {}): Pick<GoogleFont, 'weights' | 'italic'> {
  const keys = Object.keys(fonts);
  const weights = [...new Set(keys.map((key) => Number.parseInt(key, 10)).filter((w) => w >= 100 && w <= 900))];
  return { weights: [...weights].sort((a, b) => a - b), italic: keys.some((key) => key.endsWith('i')) };
}

/** The metadata endpoint prefixes its JSON with `)]}'` against JSON hijacking. */
export function parseMetadata(text: string): GoogleFont[] {
  const json = JSON.parse(text.slice(text.indexOf('{'))) as { familyMetadataList?: MetadataFamily[] };
  const fonts = (json.familyMetadataList ?? [])
    .map((family) => ({
      family: family.family,
      category: (family.category ?? 'Other').toLowerCase().replaceAll(' ', '-'),
      popularity: family.popularity ?? 0,
      ...variantsOf(family.fonts),
    }))
    .filter((font) => font.family && font.weights.length > 0);
  return [...fonts].sort((a, b) => a.popularity - b.popularity);
}

async function load(): Promise<GoogleFont[]> {
  try {
    const response = await fetch(METADATA_URL, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const fonts = parseMetadata(await response.text());
    cache = { fonts, expires: Date.now() + TTL_MS };
    return fonts;
  } catch (error) {
    logs.server.warn('cms', 'google-fonts-unavailable', { reason: (error as Error).message });
    if (cache) return cache.fonts;
    throw new GraphQLError('The Google Fonts list could not be loaded. Try again in a minute.', {
      extensions: { code: 'SERVICE_UNAVAILABLE' },
    });
  } finally {
    loading = null;
  }
}

async function catalogue(): Promise<GoogleFont[]> {
  if (cache && cache.expires > Date.now()) return cache.fonts;
  loading ??= load();
  return loading;
}

export const cmsGoogleFontsService = {
  async search(args: { search?: string | null; category?: string | null; offset?: number | null; limit?: number | null }) {
    const fonts = await catalogue();
    const needle = (args.search ?? '').trim().toLowerCase();
    const matches = fonts.filter(
      (font) => (!needle || font.family.toLowerCase().includes(needle)) && (!args.category || font.category === args.category)
    );
    const offset = Math.max(0, args.offset ?? 0);
    const limit = Math.min(MAX_LIMIT, Math.max(1, args.limit ?? 40));
    return {
      fonts: matches.slice(offset, offset + limit),
      total: matches.length,
      categories: [...new Set(fonts.map((font) => font.category))].sort((a, b) => a.localeCompare(b)),
    };
  },
};
