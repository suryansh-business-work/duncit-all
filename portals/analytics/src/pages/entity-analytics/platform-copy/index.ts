import { DATABASE_COPY } from './database';
import { ENV_KEYS_COPY } from './env-keys';
import { SONARQUBE_COPY } from './sonarqube';
import { COVERAGE_COPY } from './coverage';
import { STRESS_COPY } from './stress';
import { E2E_COPY } from './e2e';
import { REVENUE_COPY } from './revenue';
import { REWARDS_COPY } from './rewards';
import { SHOP_COPY } from './shop';
import { VENUES_COPY } from './venues';
import { FUNNEL_COPY } from './funnel';
import { MARKETING_COPY } from './marketing';
import { COMMUNICATIONS_COPY } from './communications';
import { SUPPORT_COPY } from './support';
import { LEGAL_COPY } from './legal';
import { API_PERFORMANCE_COPY } from './api-performance';
import { SERVER_COPY } from './server';
import { AI_USAGE_COPY } from './ai-usage';
import { APP_RELEASES_COPY } from './app-releases';
import type { PageCopy } from './types';

/**
 * The copy of every page past the first five, folded into one `PageCopy` so
 * copy.ts and slice-copy.ts can spread each part into the maps they already
 * serve. Server keys are prefixed per page (`db_`, `sonar_`, `e2e_`), so no two
 * pages ever claim the same key.
 */

const PAGES: readonly PageCopy[] = [
  DATABASE_COPY,
  ENV_KEYS_COPY,
  SONARQUBE_COPY,
  COVERAGE_COPY,
  STRESS_COPY,
  E2E_COPY,
  REVENUE_COPY,
  REWARDS_COPY,
  SHOP_COPY,
  VENUES_COPY,
  FUNNEL_COPY,
  MARKETING_COPY,
  COMMUNICATIONS_COPY,
  SUPPORT_COPY,
  LEGAL_COPY,
  API_PERFORMANCE_COPY,
  SERVER_COPY,
  AI_USAGE_COPY,
  APP_RELEASES_COPY,
];

const merged = <K extends keyof PageCopy>(part: K): PageCopy[K] =>
  PAGES.reduce<PageCopy[K]>((all, page) => ({ ...all, ...page[part] }), {});

export const PLATFORM_COPY: PageCopy = {
  kpis: merged('kpis'),
  trends: merged('trends'),
  series: merged('series'),
  breakdowns: merged('breakdowns'),
  slices: merged('slices'),
  leaderboards: merged('leaderboards'),
  columns: merged('columns'),
};
