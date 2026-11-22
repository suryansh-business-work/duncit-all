import type { Environment } from '@modules/ai/askBot/askBot.links';
import { consoleLink, linkUrl } from '../entity/links';
import { ENV_CATEGORY_OF, readAppleInsightsConfig, readPlayInsightsConfig, type ConfigRead } from './appInsights.config';
import { AppInsightDayModel, AppInsightStateModel, type IAppInsightState } from './appInsights.model';
import { APP_INSIGHT_STORES, type AppInsightStore } from './appInsights.metrics';
import { SYNC_STALE_MS } from './appInsights.sync';

/**
 * Each store's integration as the page shows it: whether it is configured
 * (and which fields are not), whether a sync is running, how the last one
 * went, and which days the history covers. Never a credential.
 *
 * DISCONNECTED — credentials missing or unusable; the page shows what to set.
 * SYNCING — a live sync holds the lock.
 * ERROR — the last attempt failed (and nothing has succeeded since).
 * CONNECTED — the last attempt succeeded.
 * PENDING — configured, but no sync has finished yet.
 */

export type AppInsightStatus = 'CONNECTED' | 'DISCONNECTED' | 'SYNCING' | 'ERROR' | 'PENDING';

type StateLike = Pick<IAppInsightState, 'syncing' | 'sync_started_at' | 'last_success_at' | 'last_attempt_at' | 'last_error'>;

export function statusOf(configured: boolean, state: StateLike | null, now = new Date()): AppInsightStatus {
  if (!configured) return 'DISCONNECTED';
  if (!state) return 'PENDING';
  const started = state.sync_started_at?.getTime() ?? 0;
  if (state.syncing && now.getTime() - started < SYNC_STALE_MS) return 'SYNCING';
  const success = state.last_success_at?.getTime() ?? 0;
  const attempt = state.last_attempt_at?.getTime() ?? 0;
  if (state.last_error && attempt >= success) return 'ERROR';
  return success ? 'CONNECTED' : 'PENDING';
}

const CONFIG_READERS: Record<AppInsightStore, () => Promise<ConfigRead<unknown>>> = {
  GOOGLE_PLAY: readPlayInsightsConfig,
  APP_STORE: readAppleInsightsConfig,
};

async function coverage(store: AppInsightStore): Promise<{ first: string | null; last: string | null }> {
  const filter = { store, dimension: 'TOTAL' };
  const [first, last] = await Promise.all([
    AppInsightDayModel.findOne(filter).sort({ day: 1 }).select('day').lean<{ day: string }>(),
    AppInsightDayModel.findOne(filter).sort({ day: -1 }).select('day').lean<{ day: string }>(),
  ]);
  return { first: first?.day ?? null, last: last?.day ?? null };
}

const iso = (date: Date | null | undefined) => date?.toISOString() ?? null;

async function storeStatus(store: AppInsightStore, environment: Environment) {
  const [read, state, days] = await Promise.all([
    CONFIG_READERS[store](),
    AppInsightStateModel.findOne({ store }).lean<IAppInsightState>(),
    coverage(store),
  ]);
  const configured = Boolean(read.config);
  return {
    store,
    configured,
    missing: read.missing,
    problem: read.problem || null,
    status: statusOf(configured, state),
    last_success_at: iso(state?.last_success_at),
    last_attempt_at: iso(state?.last_attempt_at),
    last_error: state?.last_error || null,
    first_day: days.first,
    last_day: days.last,
    setup_url: linkUrl(consoleLink('tech', `/?selectedtab_category=${ENV_CATEGORY_OF[store]}`), environment),
  };
}

export function appInsightsStatus(environment: Environment) {
  return Promise.all(APP_INSIGHT_STORES.map((store) => storeStatus(store, environment)));
}
