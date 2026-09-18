import { DATABASE_COPY } from './database';
import { ENV_KEYS_COPY } from './env-keys';
import { SONARQUBE_COPY } from './sonarqube';
import { COVERAGE_COPY } from './coverage';
import { STRESS_COPY } from './stress';
import { E2E_COPY } from './e2e';
import type { PageCopy } from './types';

/**
 * The Tech, Security and Testing pages' copy, folded into one `PageCopy` so
 * copy.ts and slice-copy.ts can spread each part into the maps they already
 * serve. Server keys are prefixed per page (`db_`, `sonar_`, `e2e_`), so no two
 * pages ever claim the same key.
 */

const PAGES: readonly PageCopy[] = [DATABASE_COPY, ENV_KEYS_COPY, SONARQUBE_COPY, COVERAGE_COPY, STRESS_COPY, E2E_COPY];

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
