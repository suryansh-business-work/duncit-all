jest.mock('../../appInsights/appInsights.config', () => ({
  ENV_CATEGORY_OF: { GOOGLE_PLAY: 'GOOGLE_PLAY', APP_STORE: 'APP_STORE_CONNECT' },
  readPlayInsightsConfig: jest.fn(),
  readAppleInsightsConfig: jest.fn(),
}));
jest.mock('../../appInsights/appInsights.model', () => ({
  AppInsightDayModel: { findOne: jest.fn() },
  AppInsightStateModel: { findOne: jest.fn() },
}));
jest.mock('../../appInsights/googlePlay.sync', () => ({ syncGooglePlay: jest.fn() }));
jest.mock('../../appInsights/appStore.sync', () => ({ syncAppStore: jest.fn() }));
jest.mock('../../entity/links', () => ({
  consoleLink: (surface: string, path: string) => ({ surface, path }),
  linkUrl: (link: { surface: string; path: string }) => `https://${link.surface}.example.test${link.path}`,
}));

import { readAppleInsightsConfig, readPlayInsightsConfig } from '../../appInsights/appInsights.config';
import { AppInsightDayModel, AppInsightStateModel } from '../../appInsights/appInsights.model';
import { appInsightsStatus, statusOf } from '../../appInsights/appInsights.status';
import { SYNC_STALE_MS } from '../../appInsights/appInsights.sync';

const m = (fn: unknown) => fn as jest.Mock;
const NOW = new Date('2026-11-22T10:00:00Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const state = (over: Record<string, unknown> = {}) => ({
  syncing: false,
  sync_started_at: null,
  last_success_at: null,
  last_attempt_at: null,
  last_error: '',
  ...over,
});

describe('statusOf', () => {
  it('is DISCONNECTED without credentials, whatever happened before', () => {
    expect(statusOf(false, state({ last_success_at: ago(1000) }), NOW)).toBe('DISCONNECTED');
  });

  it('is PENDING when configured but nothing has finished yet', () => {
    expect(statusOf(true, null, NOW)).toBe('PENDING');
    expect(statusOf(true, state(), NOW)).toBe('PENDING');
  });

  it('is SYNCING while a live sync holds the lock, but not for a stale lock', () => {
    expect(statusOf(true, state({ syncing: true, sync_started_at: ago(60_000) }), NOW)).toBe('SYNCING');
    expect(statusOf(true, state({ syncing: true, sync_started_at: ago(SYNC_STALE_MS + 1), last_success_at: ago(SYNC_STALE_MS * 3) }), NOW)).toBe(
      'CONNECTED'
    );
  });

  it('is ERROR when the latest attempt failed, CONNECTED once a later one succeeds', () => {
    expect(statusOf(true, state({ last_success_at: ago(5000), last_attempt_at: ago(1000), last_error: 'denied' }), NOW)).toBe('ERROR');
    expect(statusOf(true, state({ last_attempt_at: ago(1000), last_error: 'denied' }), NOW)).toBe('ERROR');
    expect(statusOf(true, state({ last_success_at: ago(1000), last_attempt_at: ago(1000), last_error: '' }), NOW)).toBe('CONNECTED');
  });
});

describe('appInsightsStatus', () => {
  const lean = (value: unknown) => ({ lean: jest.fn().mockResolvedValue(value) });
  const chain = (value: unknown) => ({ sort: () => ({ select: () => lean(value) }) });

  it('reports both stores — configured or not, missing fields, coverage and the setup link — never a credential', async () => {
    m(readPlayInsightsConfig).mockResolvedValue({ config: { account: { private_key: 'SECRET' } }, missing: [], problem: '' });
    m(readAppleInsightsConfig).mockResolvedValue({ config: null, missing: ['key_id', 'private_key'], problem: '' });
    m(AppInsightStateModel.findOne).mockImplementation(({ store }: { store: string }) =>
      lean(store === 'GOOGLE_PLAY' ? state({ last_success_at: NOW, last_attempt_at: NOW }) : null)
    );
    m(AppInsightDayModel.findOne).mockImplementation(({ store }: { store: string }) =>
      store === 'GOOGLE_PLAY'
        ? { sort: ({ day }: { day: number }) => ({ select: () => lean({ day: day === 1 ? '2025-01-01' : '2026-11-20' }) }) }
        : chain(null)
    );
    const [play, apple] = await appInsightsStatus('PRODUCTION');
    expect(play).toMatchObject({
      store: 'GOOGLE_PLAY',
      configured: true,
      missing: [],
      problem: null,
      status: 'CONNECTED',
      last_success_at: NOW.toISOString(),
      last_error: null,
      first_day: '2025-01-01',
      last_day: '2026-11-20',
      setup_url: 'https://tech.example.test/?selectedtab_category=GOOGLE_PLAY',
    });
    expect(apple).toMatchObject({
      store: 'APP_STORE',
      configured: false,
      missing: ['key_id', 'private_key'],
      status: 'DISCONNECTED',
      first_day: null,
      setup_url: 'https://tech.example.test/?selectedtab_category=APP_STORE_CONNECT',
    });
    expect(JSON.stringify([play, apple])).not.toContain('SECRET');
  });
});
