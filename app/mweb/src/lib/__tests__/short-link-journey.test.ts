import { describe, expect, it, vi, beforeEach } from 'vitest';

const apolloMock = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('../../apollo', () => ({ apolloClient: apolloMock }));

import {
  captureShortLinkClick,
  clickIdFromSearch,
  reportJourneyStep,
  storedClickId,
} from '../short-link-journey';
import { stepForPath } from '../../app/useShortLinkJourney';

beforeEach(() => {
  localStorage.clear();
  apolloMock.mutate.mockReset();
  apolloMock.mutate.mockResolvedValue({});
});

describe('clickIdFromSearch', () => {
  it('reads the click id a short link appends', () => {
    expect(clickIdFromSearch('?utm_source=instagram&dlc=abc-123')).toBe('abc-123');
  });

  it('is null for ordinary traffic', () => {
    expect(clickIdFromSearch('')).toBeNull();
    expect(clickIdFromSearch('?utm_source=instagram')).toBeNull();
  });
});

describe('captureShortLinkClick', () => {
  it('remembers the click that brought the visitor', () => {
    expect(captureShortLinkClick('?dlc=abc-123')).toBe('abc-123');
    expect(storedClickId()).toBe('abc-123');
  });

  // Otherwise the last link before checkout would take credit for the work the
  // first one did.
  it('keeps the first link when a second one arrives later', () => {
    captureShortLinkClick('?dlc=first');
    expect(captureShortLinkClick('?dlc=second')).toBe('first');
    expect(storedClickId()).toBe('first');
  });

  it('leaves an existing attribution alone on an ordinary page load', () => {
    captureShortLinkClick('?dlc=first');
    expect(captureShortLinkClick('')).toBe('first');
  });

  it('is null for a visitor who never followed a link', () => {
    expect(captureShortLinkClick('')).toBeNull();
    expect(storedClickId()).toBeNull();
  });

  // Private mode throws on write; attribution is simply unavailable there.
  it('survives storage being unavailable', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(captureShortLinkClick('?dlc=abc-123')).toBe('abc-123');
    setItem.mockRestore();

    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(storedClickId()).toBeNull();
    getItem.mockRestore();
  });
});

describe('reportJourneyStep', () => {
  it('reports the step against the stored click', () => {
    captureShortLinkClick('?dlc=abc-123');
    reportJourneyStep('VIEWED_POD');
    expect(apolloMock.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ variables: { click_id: 'abc-123', step: 'VIEWED_POD' } }),
    );
  });

  // The vast majority of traffic never came through a link — it must cost
  // them nothing at all.
  it('says nothing for a visitor with no attribution', () => {
    reportJourneyStep('LANDED');
    expect(apolloMock.mutate).not.toHaveBeenCalled();
  });

  it('never lets a failed report surface to the screen', async () => {
    captureShortLinkClick('?dlc=abc-123');
    apolloMock.mutate.mockRejectedValue(new Error('offline'));
    expect(() => reportJourneyStep('LANDED')).not.toThrow();
    await Promise.resolve();
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
