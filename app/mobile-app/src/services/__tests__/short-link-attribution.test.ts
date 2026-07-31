jest.unmock('@/services/short-link-attribution');

const mockParse = jest.fn();
const mockGetInitialURL = jest.fn();
const mockAddEventListener = jest.fn();
jest.mock('expo-linking', () => ({
  parse: (url: string) => mockParse(url),
  getInitialURL: () => mockGetInitialURL(),
  addEventListener: (type: string, handler: (event: { url: string }) => void) =>
    mockAddEventListener(type, handler),
}));

jest.mock('@/services/secure-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/constants/config', () => ({
  config: { apiUrl: 'https://server.duncit.com' },
}));
jest.mock('@/navigation/navigationRef', () => ({
  navigationRef: { getCurrentRoute: jest.fn() },
}));

import { getItem, setItem } from '@/services/secure-storage';
import { graphqlRequest } from '@/services/graphql.client';
import { navigationRef } from '@/navigation/navigationRef';
import {
  SHORT_LINK_CLICK_KEY,
  captureFromUrl,
  initShortLinkAttribution,
  reportJourneyForCurrentRoute,
  reportJourneyStep,
  shortLinkParamsFromUrl,
  stepForRouteName,
  storedClickId,
} from '../short-link-attribution';

const getItemMock = jest.mocked(getItem);
const setItemMock = jest.mocked(setItem);
const graphqlRequestMock = jest.mocked(graphqlRequest);
const getCurrentRouteMock = navigationRef.getCurrentRoute as jest.Mock;

const fetchMock = jest.fn();
(globalThis as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

const okFetch = (clickId: string | null) =>
  fetchMock.mockResolvedValue({ json: () => Promise.resolve({ click_id: clickId }) });

/** Let the fire-and-forget promise chains inside the module settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  jest.clearAllMocks();
  getItemMock.mockResolvedValue(null);
  setItemMock.mockResolvedValue(undefined);
  graphqlRequestMock.mockResolvedValue({ recordShortLinkJourney: true });
  mockParse.mockImplementation((url: string) => ({
    queryParams: Object.fromEntries(new URL(url).searchParams),
  }));
});

describe('shortLinkParamsFromUrl', () => {
  it('reads both markers off a deep link', () => {
    expect(
      shortLinkParamsFromUrl('https://mweb.duncit.com/club/c/pod/p?dl=aB3xY9Zq&dlc=c-1'),
    ).toEqual({ code: 'aB3xY9Zq', clickId: 'c-1' });
  });

  it('is empty for ordinary links, arrays and blanks', () => {
    expect(shortLinkParamsFromUrl('https://mweb.duncit.com/?utm_source=x')).toEqual({
      code: null,
      clickId: null,
    });
    mockParse.mockReturnValue({ queryParams: { dl: ['a', 'b'], dlc: '' } });
    expect(shortLinkParamsFromUrl('whatever')).toEqual({ code: null, clickId: null });
  });

  it('answers empty rather than throwing on an unparseable URL', () => {
    mockParse.mockImplementation(() => {
      throw new Error('bad url');
    });
    expect(shortLinkParamsFromUrl(':::')).toEqual({ code: null, clickId: null });
  });
});

describe('storedClickId', () => {
  it('reads the remembered click, and survives the store being unavailable', async () => {
    getItemMock.mockResolvedValue('c-1');
    expect(await storedClickId()).toBe('c-1');
    getItemMock.mockRejectedValue(new Error('no keystore'));
    expect(await storedClickId()).toBeNull();
  });
});

describe('captureFromUrl', () => {
  it('reports a dlc landing and remembers the click', async () => {
    okFetch('c-1');
    expect(await captureFromUrl('https://mweb.duncit.com/x?dlc=c-1')).toBe('c-1');
    expect(setItemMock).toHaveBeenCalledWith(SHORT_LINK_CLICK_KEY, 'c-1');
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe('/r/v');
    expect(url.searchParams.get('dlc')).toBe('c-1');
  });

  // The mWeb → native handoff: the Open-in-App banner deep-links
  // duncit:/<path> decorated with the stored attribution, so the journey
  // continues in the app under the SAME click.
  it('captures the app-scheme deep link mWeb hands over', async () => {
    okFetch('c-1');
    expect(
      await captureFromUrl('duncit:/club/smashers/pod/night?utm_source=instagram&dlc=c-1'),
    ).toBe('c-1');
    expect(setItemMock).toHaveBeenCalledWith(SHORT_LINK_CLICK_KEY, 'c-1');
  });

  // A tagged URL that skipped the redirect still identifies the link by code.
  it('resolves a code-only landing through the server', async () => {
    okFetch('c-minted');
    expect(await captureFromUrl('https://mweb.duncit.com/x?dl=aB3xY9Zq')).toBe('c-minted');
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('dl')).toBe('aB3xY9Zq');
  });

  it('answers the stored click for no URL and for an unmarked URL', async () => {
    getItemMock.mockResolvedValue('c-kept');
    expect(await captureFromUrl(null)).toBe('c-kept');
    expect(await captureFromUrl('https://mweb.duncit.com/plain')).toBe('c-kept');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // The link that started the journey keeps it.
  it('keeps the first attribution while still reporting the new landing', async () => {
    getItemMock.mockResolvedValue('c-first');
    okFetch('c-second');
    expect(await captureFromUrl('https://mweb.duncit.com/x?dlc=c-second')).toBe('c-first');
    expect(setItemMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stores nothing when the server does not recognise the marker', async () => {
    okFetch(null);
    expect(await captureFromUrl('https://mweb.duncit.com/x?dl=aB3xY9Zq')).toBeNull();
    expect(setItemMock).not.toHaveBeenCalled();
  });

  it('survives the API being unreachable, and a refused write', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    expect(await captureFromUrl('https://mweb.duncit.com/x?dlc=c-1')).toBeNull();

    okFetch('c-1');
    setItemMock.mockRejectedValue(new Error('no keystore'));
    expect(await captureFromUrl('https://mweb.duncit.com/x?dlc=c-1')).toBeNull();
  });
});

describe('stepForRouteName', () => {
  it('maps the funnel screens to their step', () => {
    expect(stepForRouteName('PodDetails')).toBe('VIEWED_POD');
    expect(stepForRouteName('Checkout')).toBe('CHECKOUT_STARTED');
    expect(stepForRouteName('ProductCheckout')).toBe('CHECKOUT_STARTED');
  });

  it('is null for other screens and for no screen at all', () => {
    expect(stepForRouteName('Home')).toBeNull();
    expect(stepForRouteName(undefined)).toBeNull();
  });
});

describe('reportJourneyStep', () => {
  it('reports the step against the stored click, authenticated', async () => {
    getItemMock.mockResolvedValue('c-1');
    reportJourneyStep('VIEWED_POD');
    await settle();
    expect(graphqlRequestMock).toHaveBeenCalledWith(
      expect.anything(),
      { click_id: 'c-1', step: 'VIEWED_POD' },
      { auth: true },
    );
  });

  it('says nothing for a device with no attribution', async () => {
    reportJourneyStep('SIGNED_UP');
    await settle();
    expect(graphqlRequestMock).not.toHaveBeenCalled();
  });

  it('never lets a failed report crash anything', async () => {
    getItemMock.mockResolvedValue('c-1');
    graphqlRequestMock.mockRejectedValue(new Error('offline'));
    expect(() => reportJourneyStep('SURVEY_DONE')).not.toThrow();
    await settle();
  });
});

describe('reportJourneyForCurrentRoute', () => {
  it('reports the step of the screen just reached', async () => {
    getItemMock.mockResolvedValue('c-1');
    getCurrentRouteMock.mockReturnValue({ name: 'Checkout' });
    reportJourneyForCurrentRoute();
    await settle();
    expect(graphqlRequestMock).toHaveBeenCalledWith(
      expect.anything(),
      { click_id: 'c-1', step: 'CHECKOUT_STARTED' },
      { auth: true },
    );
  });

  it('does nothing between ordinary screens or before navigation is up', async () => {
    getCurrentRouteMock.mockReturnValue(undefined);
    reportJourneyForCurrentRoute();
    getCurrentRouteMock.mockReturnValue({ name: 'Home' });
    reportJourneyForCurrentRoute();
    await settle();
    expect(graphqlRequestMock).not.toHaveBeenCalled();
  });
});

describe('initShortLinkAttribution', () => {
  it('captures the launch URL and every URL while running, and unsubscribes', async () => {
    okFetch('c-1');
    mockGetInitialURL.mockResolvedValue('https://mweb.duncit.com/x?dlc=c-1');
    const remove = jest.fn();
    mockAddEventListener.mockReturnValue({ remove });

    const unsubscribe = initShortLinkAttribution();
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const handler = mockAddEventListener.mock.calls[0][1];
    handler({ url: 'https://mweb.duncit.com/y?dlc=c-2' });
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    unsubscribe();
    expect(remove).toHaveBeenCalled();
  });

  it('survives the launch URL being unreadable', async () => {
    mockGetInitialURL.mockRejectedValue(new Error('no activity'));
    mockAddEventListener.mockReturnValue({ remove: jest.fn() });
    expect(() => initShortLinkAttribution()).not.toThrow();
    await settle();
  });
});
