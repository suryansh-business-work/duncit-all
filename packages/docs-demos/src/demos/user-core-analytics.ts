import {
  createProductTracker,
  screenNameFromPath,
  type ProductEventPayload,
} from '@duncit/user-core';
import { defineDemo } from '../types';

/** A walk through the app: each step a path opened after `after_ms` on the screen before. */
interface TrackerMock {
  steps: Array<{ path: string; after_ms: number }>;
  /** Minutes in the background before the last step — over 30 starts a new session. */
  background_minutes: number;
  analytics_consent: boolean;
}

/**
 * The product-analytics tracker on a hand-moved clock: what it would send for a
 * short walk through mWeb. Every number comes from the real tracker — the
 * screen names, the time on each screen, and where a session is cut.
 */
export const productTrackerDemo = defineDemo<TrackerMock>({
  id: 'product-analytics',
  title: 'One tracker: screens, time on screen, sessions',
  note:
    'Raise background_minutes past 30 and the last screen lands in a new session. Time in the background never counts toward a screen. Turn analytics_consent off and nothing is queued at all. Two pod pages with different ids are one screen, /pods/:id.',
  mock: {
    steps: [
      { path: '/', after_ms: 0 },
      { path: '/pods/6650f0c2a1b2c3d4e5f60718', after_ms: 8_000 },
      { path: '/pods/6650f0c2a1b2c3d4e5f60718/join?ref=share', after_ms: 25_000 },
    ],
    background_minutes: 5,
    analytics_consent: true,
  },
  compute: (mock) => {
    let clock = Date.parse('2026-10-31T10:00:00.000Z');
    const sent: ProductEventPayload[] = [];
    const tracker = createProductTracker({
      platform: 'mweb',
      appVersion: 'demo',
      allowed: () => mock.analytics_consent,
      now: () => clock,
      send: async (batch) => {
        sent.push(...batch);
      },
    });
    mock.steps.forEach((step, index) => {
      clock += step.after_ms;
      if (index === mock.steps.length - 1 && mock.steps.length > 1) {
        tracker.background();
        clock += mock.background_minutes * 60_000;
        tracker.foreground();
      }
      tracker.screen(screenNameFromPath(step.path), { path: step.path });
    });
    // The flush hands the batch to `send` before its first await, so `sent` is filled here.
    tracker.flush();
    tracker.stop();
    const sessions = new Set(sent.map((event) => event.session_id));
    return {
      'Events sent': sent.map((event) => `${event.event_name} ${event.screen_name}`),
      'Time on the screen before (ms)': sent
        .filter((event) => event.event_name === 'screen_view')
        .map((event) => `${event.previous_screen || '(start)'} → ${event.duration_ms ?? '—'}`),
      Sessions: sessions.size,
    };
  },
});
