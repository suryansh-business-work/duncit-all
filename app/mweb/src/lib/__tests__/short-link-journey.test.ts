import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const apolloMock = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('../../apollo', () => ({ apolloClient: apolloMock }));

import {
  captureShortLinkClick,
  reportJourneyStep,
  storedClickId,
} from '../short-link-journey';
import { stepForPath } from '../../app/useShortLinkJourney';

beforeEach(() => {
  localStorage.clear();
  apolloMock.mutate.mockReset();
  apolloMock.mutate.mockResolvedValue({});
  // Echo dlc like the real /r/v does; a dl-only visit gets a minted id.
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation((input: string) => {
      const dlc = new URL(input).searchParams.get('dlc');
      return Promise.resolve({ json: () => Promise.resolve({ click_id: dlc ?? 'c-minted' }) });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('captureShortLinkClick', () => {
  // The redirect appends dlc; the landing hands it to /r/v (which stamps
  // LANDED server-side) and remembers it for the rest of the funnel.
  it('reports the landing and remembers the click', async () => {
    expect(await captureShortLinkClick('?utm_source=instagram&dlc=c-1')).toBe('c-1');
    expect(storedClickId()).toBe('c-1');
    const url = new URL(vi.mocked(globalThis.fetch).mock.calls[0][0] as string);
    expect(url.pathname).toBe('/r/v');
    expect(url.searchParams.get('dlc')).toBe('c-1');
  });

  // A shared tagged URL that skipped the redirect still identifies the link
  // by its dl code — the server mints the click and hands the id back.
  it('resolves a code-only landing through the server', async () => {
    expect(await captureShortLinkClick('?dl=aB3xY9Zq')).toBe('c-minted');
    expect(storedClickId()).toBe('c-minted');
  });

  it('keeps the first attribution when a second link arrives', async () => {
    await captureShortLinkClick('?dlc=first');
    expect(await captureShortLinkClick('?dlc=second')).toBe('first');
    expect(storedClickId()).toBe('first');
  });

  it('does nothing at all for ordinary traffic', async () => {
    expect(await captureShortLinkClick('')).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe('reportJourneyStep', () => {
  // A report waits on the landing capture rather than reading storage: on the
  // page load that FOLLOWS a link the click id has not arrived from /r/v yet.
  // That capture is module state, so each case starts it from "no link".
  beforeEach(async () => {
    await captureShortLinkClick('');
  });

  it('reports the step against the stored click', async () => {
    await captureShortLinkClick('?dlc=abc-123');
    expect(storedClickId()).toBe('abc-123');
    reportJourneyStep('VIEWED_POD');
    await vi.waitFor(() =>
      expect(apolloMock.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ variables: { click_id: 'abc-123', step: 'VIEWED_POD' } }),
      ),
    );
  });

  // Signing in is the first step reported, and it happens while /r/v is still
  // in flight — reading storage there would drop the account binding a later
  // payment is matched against.
  it('waits for a landing capture still in flight', async () => {
    let resolveVisit: (body: unknown) => void = () => undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveVisit = (body) => resolve({ json: () => Promise.resolve(body) });
        }),
      ),
    );
    const landing = captureShortLinkClick('?dlc=late-1');
    reportJourneyStep('SIGNED_UP');
    expect(apolloMock.mutate).not.toHaveBeenCalled();
    resolveVisit({ click_id: 'late-1' });
    await landing;
    await vi.waitFor(() =>
      expect(apolloMock.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ variables: { click_id: 'late-1', step: 'SIGNED_UP' } }),
      ),
    );
  });

  // The vast majority of traffic never came through a link — it must cost
  // them nothing at all.
  it('says nothing for a visitor with no attribution', async () => {
    reportJourneyStep('SIGNED_UP');
    await Promise.resolve();
    expect(apolloMock.mutate).not.toHaveBeenCalled();
  });

  it('never lets a failed report surface to the screen', async () => {
    await captureShortLinkClick('?dlc=abc-123');
    apolloMock.mutate.mockRejectedValue(new Error('offline'));
    expect(() => reportJourneyStep('SURVEY_DONE')).not.toThrow();
    await vi.waitFor(() => expect(apolloMock.mutate).toHaveBeenCalled());
  });
});

describe('stepForPath', () => {
  it('maps the funnel pages to their step', () => {
    expect(stepForPath('/club/smashers/pod/night-match')).toBe('VIEWED_POD');
    expect(stepForPath('/checkout')).toBe('CHECKOUT_STARTED');
    expect(stepForPath('/checkout/pod-1')).toBe('CHECKOUT_STARTED');
    expect(stepForPath('/product-checkout')).toBe('CHECKOUT_STARTED');
    expect(stepForPath('/signup-survey')).toBe('SIGNED_UP');
  });

  it('is null for pages that are not part of the funnel', () => {
    expect(stepForPath('/')).toBeNull();
    expect(stepForPath('/explore')).toBeNull();
    // A club page is not a pod page.
    expect(stepForPath('/club/smashers')).toBeNull();
  });
});
