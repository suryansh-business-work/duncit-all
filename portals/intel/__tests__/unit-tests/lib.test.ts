import { describe, expect, it, vi } from 'vitest';
import { liveStore } from '../../src/components/ChatStream';
import { mayDecide } from '../../src/lib/approval';
import { relativeTime } from '../../src/lib/time';
import { linkCitations } from '../../src/pages/chat/messages/AnswerMarkdown';
import { defaultEnvironment, initialSettings } from '../../src/pages/chat/useComposerSettings';
import { isSettingsSection, SETTINGS_SECTIONS } from '../../src/pages/settings/sections';
import { parseSettings } from '../../src/pages/settings/settings.types';
import { bootstrap } from '../testkit';

vi.mock('@duncit/app-settings', async (importOriginal) => ({ ...(await importOriginal<object>()), formatDateTime: (iso: string) => `formatted:${iso}` }));

const t = (key: string, o?: { vars?: Record<string, string | number> }) => (o?.vars ? `${key}:${Object.values(o.vars).join(',')}` : key);

describe('relativeTime', () => {
  const now = Date.parse('2026-11-23T12:00:00Z');
  it('words recent times from the catalogue', () => {
    expect(relativeTime(null, t, now)).toBe('intel.time.never');
    expect(relativeTime('not a date', t, now)).toBe('intel.time.never');
    expect(relativeTime('2026-11-23T11:59:40Z', t, now)).toBe('intel.time.justNow');
    expect(relativeTime('2026-11-23T11:55:00Z', t, now)).toBe('intel.time.minutesAgo:5');
    expect(relativeTime('2026-11-23T09:00:00Z', t, now)).toBe('intel.time.hoursAgo:3');
    expect(relativeTime('2026-11-21T12:00:00Z', t, now)).toBe('intel.time.daysAgo:2');
  });
  it('falls back to the admin date format after a week', () => {
    expect(relativeTime('2026-11-01T00:00:00Z', t, now)).toBe('formatted:2026-11-01T00:00:00Z');
  });
});

describe('mayDecide (client hint mirrors the server rule)', () => {
  const me = { user_id: 'u1', can_admin: true };
  it('hides production approve from the requester under four-eyes and from non-admins', () => {
    expect(mayDecide({ environment: 'PRODUCTION', four_eyes: true, requested_by: 'u1' }, me)).toBe(false);
    expect(mayDecide({ environment: 'PRODUCTION', four_eyes: true, requested_by: 'u2' }, me)).toBe(true);
    expect(mayDecide({ environment: 'PRODUCTION', four_eyes: false, requested_by: 'u2' }, { user_id: 'u3', can_admin: false })).toBe(false);
  });
  it('lets the requester or an admin decide staging, and nobody without a session', () => {
    expect(mayDecide({ environment: 'STAGING', four_eyes: false, requested_by: 'u1' }, { user_id: 'u1', can_admin: false })).toBe(true);
    expect(mayDecide({ environment: 'STAGING', four_eyes: false, requested_by: 'u9' }, { user_id: 'u1', can_admin: false })).toBe(false);
    expect(mayDecide({ environment: 'STAGING', four_eyes: false, requested_by: 'u1' }, null)).toBe(false);
  });
});

describe('linkCitations', () => {
  it('turns [S2] into a citation link but leaves existing links alone', () => {
    expect(linkCitations('Up 5% [S2] and [S10].')).toBe('Up 5% [S2](#cite-S2) and [S10](#cite-S10).');
    expect(linkCitations('[S1](https://x)')).toBe('[S1](https://x)');
  });
});

describe('composer defaults', () => {
  it('starts in the default environment only when the person may read it', () => {
    expect(defaultEnvironment(bootstrap())).toBe('STAGING');
    expect(defaultEnvironment(bootstrap({ default_environment: 'BOTH' }))).toBe('BOTH');
    expect(defaultEnvironment(bootstrap({ default_environment: 'BOTH' }, { environments: ['STAGING'] }))).toBe('STAGING');
    expect(defaultEnvironment(bootstrap({ default_environment: 'PRODUCTION' }, { environments: ['STAGING'] }))).toBe('STAGING');
    expect(defaultEnvironment(null)).toBe('STAGING');
  });
  it('takes a saved conversation’s own model, environment and sources', () => {
    const conv = { model: 'gpt-4o-mini', environment: 'PRODUCTION', sources: ['GITHUB'] } as never;
    expect(initialSettings(conv, bootstrap())).toEqual({ model: 'gpt-4o-mini', environment: 'PRODUCTION', sources: ['GITHUB'] });
    expect(initialSettings(null, bootstrap())).toEqual({ model: 'gpt-4o', environment: 'STAGING', sources: [] });
  });
});

describe('liveStore', () => {
  it('builds streamed text and tool states per message and forgets them when done', () => {
    liveStore.reset();
    liveStore.delta('m1', 'Hel');
    liveStore.delta('m1', 'lo');
    liveStore.tool({ message_id: 'm1', name: 'search_knowledge', status: 'RUNNING' });
    liveStore.tool({ message_id: 'm1', name: 'search_knowledge', title: 'Search', status: 'OK' });
    expect(liveStore.get().m1).toEqual({ text: 'Hello', tools: [{ name: 'search_knowledge', title: 'Search', status: 'OK' }] });
    const seen = vi.fn();
    const off = liveStore.subscribe(seen);
    liveStore.done('m1');
    expect(liveStore.get().m1).toBeUndefined();
    expect(seen).toHaveBeenCalled();
    off();
  });
});

describe('settings helpers', () => {
  it('knows all 17 sections and nothing else', () => {
    expect(SETTINGS_SECTIONS).toHaveLength(17);
    expect(isSettingsSection('qdrant')).toBe(true);
    expect(isSettingsSection('billing')).toBe(false);
    expect(isSettingsSection(undefined)).toBe(false);
  });
  it('refuses an unreadable settings document instead of defaulting silently', () => {
    expect(() => parseSettings('{bad')).toThrow();
    expect(parseSettings('{"openai":{"env_entry_id":""}}').openai.env_entry_id).toBe('');
  });
});
