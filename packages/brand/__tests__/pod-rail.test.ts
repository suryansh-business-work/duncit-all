import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  POD_RAIL_KEYS,
  POD_RAIL_SIZE,
  fetchRailPods,
  podRailCopy,
  railChanged,
  railPodPrice,
  railPodUrl,
  railPodWhen,
  type RailPod,
} from '../src/pod-rail';

const pod = (over: Partial<RailPod> = {}): RailPod => ({
  id: 'p1',
  pod_id: 'sunday-run',
  club_slug: 'run-club',
  pod_title: 'Sunday Run',
  pod_date_time: '2026-11-02T03:30:00.000Z',
  image_url: 'https://img.test/run.jpg',
  zone_name: 'Indiranagar',
  pod_type: 'PAID',
  pod_amount: 299,
  ...over,
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchRailPods', () => {
  it('asks for one rail of pods and hands back what the API answers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: { websiteUpcomingPods: [pod()] } }) });
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchRailPods('https://api.test/gql')).toEqual([pod()]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/gql');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.variables).toEqual({ limit: POD_RAIL_SIZE });
    expect(body.query).toContain('websiteUpcomingPods');
  });

  it('answers an empty rail when the data carries no pods', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: {} }) }));
    expect(await fetchRailPods('u')).toEqual([]);
  });

  it('answers an empty rail (and says why) on GraphQL errors or a failed response', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ errors: [{ message: 'x' }] }) }));
    expect(await fetchRailPods('u')).toEqual([]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => ({}) }));
    expect(await fetchRailPods('u')).toEqual([]);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('answers an empty rail when the request itself throws', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await fetchRailPods('u')).toEqual([]);
    expect(warn).toHaveBeenCalledWith('[pod-rail] pods could not be loaded', expect.any(Error));
  });
});

describe('railPodUrl', () => {
  it('builds mWeb’s pod page from the two slugs, without a doubled slash', () => {
    expect(railPodUrl('https://mweb.duncit.com/', pod())).toBe('https://mweb.duncit.com/club/run-club/pod/sunday-run');
    expect(railPodUrl('https://mweb.duncit.com', pod())).toBe('https://mweb.duncit.com/club/run-club/pod/sunday-run');
  });

  it('encodes a slug that carries URL-significant characters', () => {
    expect(railPodUrl('https://m.test', pod({ club_slug: 'a b', pod_id: 'x/y' }))).toBe('https://m.test/club/a%20b/pod/x%2Fy');
  });
});

describe('railPodPrice', () => {
  const copy = { free: 'Free' };

  it('says the copy’s word for a FREE pod, or one priced at nothing', () => {
    expect(railPodPrice(pod({ pod_type: 'FREE', pod_amount: 0 }), copy)).toBe('Free');
    expect(railPodPrice(pod({ pod_type: 'FREE', pod_amount: 500 }), copy)).toBe('Free');
    expect(railPodPrice(pod({ pod_amount: 0 }), copy)).toBe('Free');
  });

  it('prices a paid pod in whole rupees', () => {
    expect(railPodPrice(pod({ pod_amount: 1499 }), copy, 'en-IN')).toBe('₹1,499');
  });
});

describe('railPodWhen', () => {
  it('names the day and time in the given locale', () => {
    const text = railPodWhen('2026-11-02T03:30:00.000Z', 'en-IN');
    expect(text).toMatch(/Nov/);
    expect(text).toMatch(/\d{1,2}:\d{2}/);
  });

  it('says nothing for a date it cannot read', () => {
    expect(railPodWhen('not a date')).toBe('');
  });
});

describe('railChanged', () => {
  it('is false for the same pods in the same order', () => {
    expect(railChanged([pod(), pod({ id: 'p2' })], [pod(), pod({ id: 'p2' })])).toBe(false);
  });

  it('is true when a pod arrives, leaves, moves or is renamed', () => {
    expect(railChanged([pod()], [pod(), pod({ id: 'p2' })])).toBe(true);
    expect(railChanged([pod(), pod({ id: 'p2' })], [pod({ id: 'p2' }), pod()])).toBe(true);
    expect(railChanged([pod()], [pod({ pod_title: 'Sunday Long Run' })])).toBe(true);
  });
});

describe('podRailCopy', () => {
  it('resolves every word the cards draw through the site’s translator', () => {
    const copy = podRailCopy((key) => `t:${key}`);
    expect(copy).toEqual({
      free: `t:${POD_RAIL_KEYS.free}`,
      previous: `t:${POD_RAIL_KEYS.previous}`,
      next: `t:${POD_RAIL_KEYS.next}`,
      open: `t:${POD_RAIL_KEYS.open}`,
    });
  });
});
