import { describe, expect, it } from 'vitest';
import {
  AGENT_DESCRIPTION,
  AGENT_KEYS,
  AGENT_NAME,
  AGENT_RUNS_PATH,
  CADENCES,
  CADENCE_LABEL,
  HOURS,
  WEEKDAYS,
  WEEKDAY_LABEL,
  canManageAgents,
  isKnownAgent,
} from '../../src/pages/agents-page/copy';

describe('agents copy', () => {
  it('names and describes every agent the console ships, by a full Localization key', () => {
    expect(AGENT_KEYS).toEqual(['CONTENT_PLANNER', 'COMMUNITY_WATCH', 'ACCOUNT_DOCTOR']);
    for (const key of AGENT_KEYS) {
      expect(AGENT_NAME[key]).toMatch(/^marketing\.agents\.[a-zA-Z]+Name$/);
      expect(AGENT_DESCRIPTION[key]).toMatch(/^marketing\.agents\.[a-zA-Z]+Description$/);
    }
  });

  it('labels both cadences, every day of the week and every hour of the day', () => {
    expect(CADENCES).toEqual(['DAY', 'WEEK']);
    expect(CADENCE_LABEL).toEqual({ DAY: 'marketing.agents.everyDay', WEEK: 'marketing.agents.everyWeek' });
    // Monday first, the way a week is planned, with Sunday (the server's 0) last.
    expect(WEEKDAYS).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect([...WEEKDAYS].sort((a, b) => a - b)).toEqual(Object.keys(WEEKDAY_LABEL).map(Number));
    expect(WEEKDAY_LABEL[0]).toBe('marketing.agents.weekdaySunday');
    expect(WEEKDAY_LABEL[6]).toBe('marketing.agents.weekdaySaturday');
    expect(HOURS).toHaveLength(24);
    expect(HOURS[0]).toBe(0);
    expect(HOURS[23]).toBe(23);
  });

  it('points every run at Activity pinned to the AGENT workflow', () => {
    expect(AGENT_RUNS_PATH).toBe('/activity?workflow=AGENT');
  });

  it('lets a marketing manager or super admin manage, and nobody else', () => {
    expect(canManageAgents(['MARKETING_MANAGER'])).toBe(true);
    expect(canManageAgents(['USER', 'SUPER_ADMIN'])).toBe(true);
    expect(canManageAgents(['MARKETING_EDITOR'])).toBe(false);
    expect(canManageAgents(['CITY_ADMIN'])).toBe(false);
    expect(canManageAgents([])).toBe(false);
  });

  it('knows which agents it has copy for', () => {
    expect(isKnownAgent('ACCOUNT_DOCTOR')).toBe(true);
    expect(isKnownAgent('LEAD_HUNTER')).toBe(false);
  });
});
