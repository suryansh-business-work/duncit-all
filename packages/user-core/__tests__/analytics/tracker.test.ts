import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProductTracker, type TrackerOptions } from '../../src/analytics/tracker';
import type { ProductEventPayload } from '../../src/analytics/taxonomy';

/** A tracker on a hand-moved clock, recording every batch it sends. */
function setup(overrides: Partial<TrackerOptions> = {}) {
  let clock = Date.parse('2026-10-31T10:00:00.000Z');
  let n = 0;
  const batches: ProductEventPayload[][] = [];
  let consent = true;
  const tracker = createProductTracker({
    platform: 'android',
    appVersion: '1.87.201',
    osVersion: '15',
    deviceType: 'phone',
    send: async (batch) => {
      batches.push(batch);
    },
    allowed: () => consent,
    now: () => clock,
    newId: () => `id${++n}`,
    ...overrides,
  });
  return {
    tracker,
    advance: (ms: number) => {
      clock += ms;
    },
    setConsent: (value: boolean) => {
      consent = value;
    },
    sent: () => batches.flat(),
    batches,
  };
}

describe('createProductTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stamps every event with the session, the platform, the version and the device', async () => {
    const { tracker, sent } = setup();
    tracker.open();
    await tracker.flush();
    expect(sent()).toEqual([
      expect.objectContaining({
        event_name: 'app_open',
        client_event_id: 'id1',
        session_id: 'id2',
        occurred_at: '2026-10-31T10:00:00.000Z',
        platform: 'android',
        app_version: '1.87.201',
        os_version: '15',
        device_type: 'phone',
        duration_ms: null,
        properties_json: '',
      }),
    ]);
  });

  it('records each screen with the one before it and the foreground time spent there', async () => {
    const { tracker, advance, sent } = setup();
    tracker.screen('Home');
    advance(4_000);
    tracker.screen('PodDetail', { podId: 'pod1', path: '/pods/pod1', title: 'Pod' });
    await tracker.flush();
    const [home, pod] = sent();
    expect(home).toMatchObject({ event_name: 'screen_view', screen_name: 'Home', previous_screen: '', duration_ms: null });
    expect(pod).toMatchObject({
      screen_name: 'PodDetail',
      previous_screen: 'Home',
      duration_ms: 4_000,
      pod_id: 'pod1',
      path: '/pods/pod1',
      title: 'Pod',
    });
  });

  it('ignores the same screen reported twice in a row, and an empty name', async () => {
    const { tracker, sent } = setup();
    tracker.screen('Home');
    tracker.screen('Home');
    tracker.screen('');
    await tracker.flush();
    expect(sent()).toHaveLength(1);
  });

  it('closes the time on the screen when the app goes to the background, and leaves background time out', async () => {
    const { tracker, advance, sent } = setup();
    tracker.screen('Explore');
    advance(3_000);
    tracker.background();
    tracker.background();
    advance(60_000);
    tracker.foreground();
    tracker.foreground();
    advance(2_000);
    tracker.screen('Profile');
    await tracker.flush();
    await tracker.flush();
    expect(sent().map((event) => [event.event_name, event.screen_name, event.duration_ms])).toEqual([
      ['screen_view', 'Explore', null],
      ['app_background', 'Explore', 3_000],
      ['app_foreground', 'Explore', null],
      ['screen_view', 'Profile', 2_000],
    ]);
  });

  it('sends what is queued as soon as the app goes to the background', async () => {
    const { tracker, batches } = setup();
    tracker.screen('Home');
    tracker.background();
    await vi.waitFor(() => expect(batches).toHaveLength(1));
  });

  it('reports no time for a screen change while the app is in the background', async () => {
    const { tracker, advance, sent } = setup();
    tracker.screen('Chat');
    tracker.background();
    advance(5_000);
    tracker.screen('ChatRoom');
    await tracker.flush();
    await tracker.flush();
    expect(sent().at(-1)).toMatchObject({ screen_name: 'ChatRoom', previous_screen: 'Chat', duration_ms: null });
  });

  it('describes a pressed control, redacting its text', async () => {
    const { tracker, sent } = setup();
    tracker.screen('PodDetail');
    tracker.click({ id: 'pod-join', name: 'Join pod', type: 'button', text: 'Pay 1499 now', href: 'https://duncit.com/x' });
    tracker.click({});
    await tracker.flush();
    expect(sent()[1]).toMatchObject({
      event_name: 'element_click',
      screen_name: 'PodDetail',
      element_id: 'pod-join',
      element_name: 'Join pod',
      element_type: 'button',
      element_text: 'Pay # now',
      target_href: 'https://duncit.com/x',
    });
    expect(sent()[2]).toMatchObject({ element_id: '', element_name: '', element_type: '', element_text: '', target_href: '' });
  });

  it('tracks any taxonomy event, with plain properties redacted and an optional element', async () => {
    const { tracker, sent } = setup();
    tracker.track('search_performed', {
      superCategorySlug: 'sports',
      properties: { query: 'yoga near a@b.com', results: 4, exact: false, page: null },
    });
    tracker.track('element_impression', { element: { id: 'banner' } });
    tracker.track('app_rated');
    await tracker.flush();
    expect(sent()[0]).toMatchObject({ event_name: 'search_performed', super_category_slug: 'sports', element_id: '' });
    expect(JSON.parse(sent()[0].properties_json)).toEqual({ query: 'yoga near [email]', results: 4, exact: false, page: null });
    expect(sent()[1]).toMatchObject({ event_name: 'element_impression', element_id: 'banner' });
    expect(sent()[2]).toMatchObject({ event_name: 'app_rated', properties_json: '' });
  });

  it('queues nothing without the analytics consent, but keeps the screen sequence right', async () => {
    const { tracker, setConsent, sent } = setup();
    setConsent(false);
    tracker.open();
    tracker.screen('Home');
    setConsent(true);
    tracker.screen('Explore');
    await tracker.flush();
    expect(sent()).toHaveLength(1);
    expect(sent()[0]).toMatchObject({ screen_name: 'Explore', previous_screen: 'Home' });
  });

  it('sends a batch on its own after the flush delay, and not after stop', async () => {
    const { tracker, batches } = setup({ flushAfterMs: 5_000 });
    tracker.open();
    await vi.advanceTimersByTimeAsync(4_999);
    expect(batches).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(batches).toHaveLength(1);
    tracker.open();
    tracker.stop();
    tracker.stop();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(batches).toHaveLength(1);
  });

  it('starts a new session after 30 minutes without activity', async () => {
    const { tracker, advance, sent } = setup();
    tracker.open();
    advance(31 * 60_000);
    tracker.screen('Home');
    await tracker.flush();
    const [first, second] = sent();
    expect(second.session_id).not.toBe(first.session_id);
  });

  it('runs on the real clock and real ids when none are given', async () => {
    const batches: ProductEventPayload[][] = [];
    const tracker = createProductTracker({
      platform: 'mweb',
      appVersion: '1.0.0',
      send: async (batch) => {
        batches.push(batch);
      },
      allowed: () => true,
    });
    tracker.open();
    await tracker.flush();
    expect(batches[0][0]).toMatchObject({ platform: 'mweb', os_version: '', device_type: '', super_category_slug: null, pod_id: null });
    expect(batches[0][0].client_event_id.length).toBeGreaterThan(10);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(batches).toHaveLength(1);
  });
});
