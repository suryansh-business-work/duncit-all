import type { MarketingAgentCadence, MarketingAgentKey } from './queries';

/**
 * Every enum the Agents page renders, mapped to its Localization key. The
 * keys are written out in full — never assembled from the enum — so the
 * translation gate can see that each one is used. The server's own `name`
 * and `description` are the fallback for an agent this map does not know.
 */
export const AGENT_KEYS: readonly MarketingAgentKey[] = ['CONTENT_PLANNER', 'COMMUNITY_WATCH', 'ACCOUNT_DOCTOR'];

export const AGENT_NAME: Record<MarketingAgentKey, string> = {
  CONTENT_PLANNER: 'marketing.agents.contentPlannerName',
  COMMUNITY_WATCH: 'marketing.agents.communityWatchName',
  ACCOUNT_DOCTOR: 'marketing.agents.accountDoctorName',
};

export const AGENT_DESCRIPTION: Record<MarketingAgentKey, string> = {
  CONTENT_PLANNER: 'marketing.agents.contentPlannerDescription',
  COMMUNITY_WATCH: 'marketing.agents.communityWatchDescription',
  ACCOUNT_DOCTOR: 'marketing.agents.accountDoctorDescription',
};

export const CADENCES: readonly MarketingAgentCadence[] = ['DAY', 'WEEK'];

export const CADENCE_LABEL: Record<MarketingAgentCadence, string> = {
  DAY: 'marketing.agents.everyDay',
  WEEK: 'marketing.agents.everyWeek',
};

/** 0 Sunday … 6 Saturday, as the server stores it. Listed Monday first, the way a week is planned. */
export const WEEKDAYS: readonly number[] = [1, 2, 3, 4, 5, 6, 0];

export const WEEKDAY_LABEL: Record<number, string> = {
  0: 'marketing.agents.weekdaySunday',
  1: 'marketing.agents.weekdayMonday',
  2: 'marketing.agents.weekdayTuesday',
  3: 'marketing.agents.weekdayWednesday',
  4: 'marketing.agents.weekdayThursday',
  5: 'marketing.agents.weekdayFriday',
  6: 'marketing.agents.weekdaySaturday',
};

export const HOURS: readonly number[] = Array.from({ length: 24 }, (_unused, hour) => hour);

/** Where every agent run is listed: Activity, pinned to the AGENT workflow. */
export const AGENT_RUNS_PATH = '/activity?workflow=AGENT';

/** The roles that switch, schedule and run an agent; everyone else with a seat reads. */
const MANAGE_ROLES = new Set(['SUPER_ADMIN', 'MARKETING_MANAGER']);

export const canManageAgents = (roles: readonly string[]): boolean => roles.some((role) => MANAGE_ROLES.has(role));

/** Whether the portal has copy for this agent; otherwise the card shows the server's own name and description. */
export const isKnownAgent = (key: string): key is MarketingAgentKey => AGENT_KEYS.some((known) => known === key);
