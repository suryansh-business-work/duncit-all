import { describe, expect, it } from 'vitest';
import {
  MY_PUBLIC_PAGE_QUERY,
  PUBLIC_PAGE_POSTER_QUERY,
  PUBLIC_PAGE_RANGES,
  PUBLISH_PUBLIC_PAGE_MUTATION,
  podSlugsFromPath,
  publicPageErrorKey,
  publicPagePosterFileName,
  publicPageQrFileName,
  publicPageTiles,
  type PublicPageInsights,
} from '../src/public-page';

const insights = (over: Partial<PublicPageInsights> = {}): PublicPageInsights => ({
  published: true,
  link: { url: 'https://duncit.com/aB3', code: 'aB3', qr_data_url: 'data:image/png;base64,x' },
  stats: { total_clicks: 120, unique_visitors: 80, platforms: [], cities: [] },
  funnel: {
    steps: [
      { step: 'SIGNED_UP', count: 12 },
      { step: 'VIEWED_POD', count: 30 },
      { step: 'PAID', count: 5 },
    ],
    conversion_rate: 6.25,
  },
  ...over,
});

const valueOf = (tiles: ReturnType<typeof publicPageTiles>) => Object.fromEntries(tiles.map((tile) => [tile.key, tile.value]));

describe('publicPageTiles', () => {
  it('lists reach then each funnel step, in order, with stable copy keys', () => {
    const tiles = publicPageTiles(insights());
    expect(tiles.map((tile) => tile.key)).toEqual(['clicks', 'visitors', 'signed-up', 'viewed-pod', 'paid', 'conversion']);
    expect(tiles.map((tile) => tile.labelKey)).toEqual([
      'publicPage.stats.clicks',
      'publicPage.stats.visitors',
      'publicPage.stats.signedUp',
      'publicPage.stats.viewedPod',
      'publicPage.stats.paid',
      'publicPage.stats.conversion',
    ]);
    expect(valueOf(tiles)).toEqual({ clicks: '120', visitors: '80', 'signed-up': '12', 'viewed-pod': '30', paid: '5', conversion: '6.25%' });
  });

  it('reads zero for an unpublished page with no stats or funnel', () => {
    expect(valueOf(publicPageTiles(insights({ published: false, link: null, stats: null, funnel: null })))).toEqual({
      clicks: '0',
      visitors: '0',
      'signed-up': '0',
      'viewed-pod': '0',
      paid: '0',
      conversion: '0%',
    });
  });

  it('reads zero for a funnel step nobody reached yet', () => {
    const tiles = publicPageTiles(insights({ funnel: { steps: [{ step: 'SIGNED_UP', count: 3 }], conversion_rate: 0 } }));
    expect(valueOf(tiles)).toMatchObject({ 'signed-up': '3', 'viewed-pod': '0', paid: '0', conversion: '0%' });
  });
});

describe('publicPageErrorKey', () => {
  it('explains an unapproved venue and a non-host instead of asking to retry', () => {
    expect(publicPageErrorKey({ graphQLErrors: [{ message: 'x', extensions: { code: 'FAILED_PRECONDITION' } }] }, 'fallback')).toBe(
      'publicPage.card.notApproved',
    );
    expect(publicPageErrorKey({ errors: [{ message: 'x', extensions: { code: 'FORBIDDEN' } }] }, 'fallback')).toBe('publicPage.card.notHost');
  });

  it('falls back for any other failure', () => {
    expect(publicPageErrorKey({ graphQLErrors: [{ message: 'x', extensions: { code: 'INTERNAL' } }] }, 'publicPage.card.loadFailed')).toBe(
      'publicPage.card.loadFailed',
    );
    expect(publicPageErrorKey(new Error('offline'), 'publicPage.card.loadFailed')).toBe('publicPage.card.loadFailed');
    expect(publicPageErrorKey(null, 'fallback')).toBe('fallback');
  });
});

describe('file names', () => {
  it('slugs the page title for the poster and the QR', () => {
    expect(publicPagePosterFileName('  The Turf @ Koramangala! ')).toBe('the-turf-koramangala-poster.pdf');
    expect(publicPageQrFileName('Café Ninety9')).toBe('caf-ninety9-qr.png');
  });

  it('names a title with nothing usable after Duncit', () => {
    expect(publicPagePosterFileName('!!!')).toBe('duncit-poster.pdf');
    expect(publicPageQrFileName('')).toBe('duncit-qr.png');
  });
});

describe('podSlugsFromPath', () => {
  it('finds the club and pod a sign-in should return to, decoded', () => {
    expect(podSlugsFromPath('/club/run%20club/pod/sunday-5k?ref=x#top')).toEqual({ clubSlug: 'run club', podSlug: 'sunday-5k' });
    expect(podSlugsFromPath('/club/a/pod/b/checkout')).toEqual({ clubSlug: 'a', podSlug: 'b' });
  });

  it('is null for any other path', () => {
    expect(podSlugsFromPath('/club/a')).toBeNull();
    expect(podSlugsFromPath('/venue/a/pod/b')).toBeNull();
    expect(podSlugsFromPath('')).toBeNull();
    expect(podSlugsFromPath(null)).toBeNull();
    expect(podSlugsFromPath(undefined)).toBeNull();
  });
});

describe('documents and ranges', () => {
  it('ask the API for the owner page by kind and reference', () => {
    expect(MY_PUBLIC_PAGE_QUERY).toContain('myPublicPage(kind: $kind, ref_id: $refId, days: $days)');
    expect(PUBLISH_PUBLIC_PAGE_MUTATION).toContain('publishPublicPage(kind: $kind, ref_id: $refId)');
    expect(PUBLIC_PAGE_POSTER_QUERY).toContain('myPublicPagePosterPdfBase64(kind: $kind, ref_id: $refId, copy: $copy)');
  });

  it('offer week, month, quarter and all time', () => {
    expect(PUBLIC_PAGE_RANGES.map((range) => range.days)).toEqual([7, 30, 90, 0]);
  });
});
