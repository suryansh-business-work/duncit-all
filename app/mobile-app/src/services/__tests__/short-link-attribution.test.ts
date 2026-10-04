import * as Linking from 'expo-linking';
import { getItem, setItem } from '@/services/secure-storage';
import { graphqlRequest } from '@/services/graphql.client';
import { navigationRef } from '@/navigation/navigationRef';
import { useConsentStore } from '@/stores/consent.store';
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

// jest.setup mocks this module for every other suite; this one tests it.
jest.unmock('@/services/short-link-attribution');

// Automocked rather than factory-mocked so the imports above can stay at the
// top of the file: a factory closing over local consts would run during those
// imports, before the consts are initialised.
jest.mock('expo-linking');
jest.mock('@/services/secure-storage');
jest.mock('@/services/graphql.client');
jest.mock('@/constants/config', () => ({ config: { apiUrl: 'https://server.duncit.com' } }));
jest.mock('@/navigation/navigationRef', () => ({
  navigationRef: { getCurrentRoute: jest.fn() },
}));
// A real zustand store with the consent store's shape, already hydrated, so
// a case sets the choice directly and the attribution subscription sees real
// (state, previous) updates.
jest.mock('@/stores/consent.store', () => {
  const { create } = jest.requireActual('zustand');
  return {
    useConsentStore: create(() => ({
      choice: null,
      hydrated: true,
      hydrate: () => Promise.resolve(),
    })),
  };
});

const GRANTED = { analytics: false, marketing: true, decided_at: '2026-10-01T00:00:00.000Z' };
const REFUSED = { analytics: true, marketing: false, decided_at: '2026-10-01T00:00:00.000Z' };

const parseMock = jest.mocked(Linking.parse);
const getInitialURLMock = jest.mocked(Linking.getInitialURL);
const addEventListenerMock = jest.mocked(Linking.addEventListener);
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

/**
 * Settle the landing capture that steps wait on: the app opened with no URL
 * and the device holds `clickId` from an earlier landing. Any step the capture
 * itself reported is cleared so a case sees only its own.
 */
const primeCapture = async (clickId: string | null) => {
  getItemMock.mockResolvedValue(clickId);
  getInitialURLMock.mockResolvedValue(null);
  addEventListenerMock.mockReturnValue({ remove: jest.fn() } as never);
  const stop = initShortLinkAttribution();
  await settle();
  stop();
  graphqlRequestMock.mockClear();
};

beforeEach(() => {
  jest.clearAllMocks();
  // Every pre-consent case below ran with attribution allowed.
  useConsentStore.setState({ choice: GRANTED });
  getItemMock.mockResolvedValue(null);
  setItemMock.mockResolvedValue(undefined);
  graphqlRequestMock.mockResolvedValue({ recordShortLinkJourney: true } as never);
  parseMock.mockImplementation(
    (url: string) =>
      ({ queryParams: Object.fromEntries(new URL(url).searchParams) }) as ReturnType<
        typeof Linking.parse
      >,
  );
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
    parseMock.mockReturnValue({ queryParams: { dl: ['a', 'b'], dlc: '' } } as never);
    expect(shortLinkParamsFromUrl('whatever')).toEqual({ code: null, clickId: null });
  });

  it('answers empty rather than throwing on an unparseable URL', () => {
    parseMock.mockImplementation(() => {
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
    await primeCapture('c-1');
    reportJourneyStep('VIEWED_POD');
    await settle();
    expect(graphqlRequestMock).toHaveBeenCalledWith(
      expect.anything(),
      { click_id: 'c-1', step: 'VIEWED_POD' },
      { auth: true },
    );
  });

  it('says nothing for a device with no attribution', async () => {
    await primeCapture(null);
    reportJourneyStep('SIGNED_UP');
    await settle();
    expect(graphqlRequestMock).not.toHaveBeenCalled();
  });

  it('never lets a failed report crash anything', async () => {
    await primeCapture('c-1');
    graphqlRequestMock.mockRejectedValue(new Error('offline'));
    expect(() => reportJourneyStep('SURVEY_DONE')).not.toThrow();
    await settle();
    // The report was attempted; its rejection was swallowed, not thrown.
    expect(graphqlRequestMock).toHaveBeenCalledTimes(1);
  });
});

describe('reportJourneyForCurrentRoute', () => {
  it('reports the step of the screen just reached', async () => {
    await primeCapture('c-1');
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
    getInitialURLMock.mockResolvedValue('https://mweb.duncit.com/x?dlc=c-1');
    const remove = jest.fn();
    addEventListenerMock.mockReturnValue({ remove } as never);

    const unsubscribe = initShortLinkAttribution();
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // The assertion above proves the listener was registered, so the call
    // tuple exists.
    const [, handler] = addEventListenerMock.mock.calls[0] as [
      string,
      (event: { url: string }) => void,
    ];
    handler({ url: 'https://mweb.duncit.com/y?dlc=c-2' });
    await settle();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    unsubscribe();
    expect(remove).toHaveBeenCalled();
  });

  it('survives the launch URL being unreadable', async () => {
    getInitialURLMock.mockRejectedValue(new Error('no activity'));
    addEventListenerMock.mockReturnValue({ remove: jest.fn() } as never);
    const unsubscribe = initShortLinkAttribution();
    await settle();
    expect(addEventListenerMock).toHaveBeenCalled();
    unsubscribe();
  });
});

describe('without marketing consent', () => {
  /** Wire the root listeners with no launch URL; answers the cleanup. */
  const init = () => {
    getInitialURLMock.mockResolvedValue(null);
    addEventListenerMock.mockReturnValue({ remove: jest.fn() } as never);
    return initShortLinkAttribution();
  };

  beforeEach(() => {
    useConsentStore.setState({ choice: REFUSED });
  });

  // Runs first in this block: it is the one that leaves a pending click,
  // and the grant at its end is what adopts (and clears) it.
  it('counts the landing anonymously, keeps nothing, and keeps the first click once allowed', async () => {
    okFetch('c-anon');
    expect(await captureFromUrl('https://mweb.duncit.com/x?dlc=c-anon')).toBe('c-anon');
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('dlc')).toBe('c-anon');
    expect(url.searchParams.has('c')).toBe(false);
    expect(getItemMock).not.toHaveBeenCalled();
    expect(setItemMock).not.toHaveBeenCalled();

    // A later landing is still counted, but the first one stays pending.
    okFetch('c-later');
    expect(await captureFromUrl('https://mweb.duncit.com/y?dlc=c-later')).toBe('c-later');

    const stop = init();
    useConsentStore.setState({ choice: GRANTED });
    await settle();
    expect(setItemMock).toHaveBeenCalledTimes(1);
    expect(setItemMock).toHaveBeenCalledWith(SHORT_LINK_CLICK_KEY, 'c-anon');
    stop();
  });

  it('answers null for no URL, an unmarked URL and an unreachable API', async () => {
    expect(await captureFromUrl(null)).toBeNull();
    expect(await captureFromUrl('https://mweb.duncit.com/plain')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRejectedValue(new Error('offline'));
    expect(await captureFromUrl('https://mweb.duncit.com/x?dlc=c-1')).toBeNull();
    expect(getItemMock).not.toHaveBeenCalled();
  });

  it('never reports a journey step', async () => {
    // The device holds a click from when consent was given; it is now refused.
    useConsentStore.setState({ choice: GRANTED });
    await primeCapture('c-1');
    useConsentStore.setState({ choice: REFUSED });
    reportJourneyStep('VIEWED_POD');
    await settle();
    expect(graphqlRequestMock).not.toHaveBeenCalled();
  });

  it('keeps an earlier stored click over the pending one when consent arrives', async () => {
    okFetch('c-new');
    await captureFromUrl('https://mweb.duncit.com/x?dlc=c-new');
    getItemMock.mockResolvedValue('c-old');
    const stop = init();
    useConsentStore.setState({ choice: GRANTED });
    await settle();
    expect(setItemMock).not.toHaveBeenCalled();
    stop();
  });

  it('has nothing to keep when no click is pending, and survives a refused write', async () => {
    const stop = init();
    useConsentStore.setState({ choice: GRANTED });
    await settle();
    expect(setItemMock).not.toHaveBeenCalled();
    stop();

    okFetch('c-2');
    useConsentStore.setState({ choice: REFUSED });
    await captureFromUrl('https://mweb.duncit.com/x?dlc=c-2');
    setItemMock.mockRejectedValue(new Error('no keystore'));
    const stopAgain = init();
    useConsentStore.setState({ choice: GRANTED });
    await settle();
    expect(setItemMock).toHaveBeenCalledWith(SHORT_LINK_CLICK_KEY, 'c-2');
    stopAgain();
  });

  it('only acts on the change to granted, and stops listening on cleanup', async () => {
    const stop = init();
    // Refused → refused, then granted → granted: neither is a new yes.
    useConsentStore.setState({ choice: { ...REFUSED } });
    useConsentStore.setState({ choice: GRANTED });
    await settle();
    getItemMock.mockClear();
    useConsentStore.setState({ choice: { ...GRANTED } });
    await settle();
    expect(getItemMock).not.toHaveBeenCalled();
    stop();

    useConsentStore.setState({ choice: REFUSED });
    useConsentStore.setState({ choice: GRANTED });
    await settle();
    expect(getItemMock).not.toHaveBeenCalled();
  });
});

describe('with marketing consent', () => {
  it('tells the server it may keep the click', async () => {
    okFetch('c-1');
    await captureFromUrl('https://mweb.duncit.com/x?dlc=c-1');
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('c')).toBe('1');
  });
});
