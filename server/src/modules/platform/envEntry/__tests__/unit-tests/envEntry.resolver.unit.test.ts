import { envEntryResolvers } from '../../envEntry.resolver';
import { envEntryService } from '../../envEntry.service';
import { envEntryTests } from '../../envEntry.tests';
import { envAttemptService } from '../../envAttempt.service';
import { envAccessService } from '../../envAccess.service';
import { envTestLogService } from '../../envTestLog.service';
import { ENV_CATEGORIES } from '../../envEntry.model';
import { CATEGORY_FIELDS, groupOf } from '../../envEntry.fields';
import { makeContext } from '@test/harness';

jest.mock('../../envEntry.service');
jest.mock('../../envEntry.tests');
jest.mock('../../envAttempt.service');
jest.mock('../../envAccess.service');
jest.mock('../../envTestLog.service');

const Q = envEntryResolvers.Query as Record<string, (...a: any[]) => Promise<any>>;
const M = envEntryResolvers.Mutation as Record<string, (...a: any[]) => Promise<any>>;

const tech = makeContext({ id: 't1', roles: ['TECH_MANAGER'] });
const comms = makeContext({ id: 'c1', roles: ['COMMUNICATIONS_MANAGER'] });
const logs = makeContext({ id: 'l1', roles: ['LOGS_MANAGER'] });
const nobody = makeContext({ id: 'n1', roles: ['USER'] });

beforeEach(() => {
  (envAccessService.require as jest.Mock).mockResolvedValue(undefined);
});

describe('groupOf', () => {
  it('names the sidebar group of every category and throws for an unknown one', () => {
    for (const category of ENV_CATEGORIES) expect(groupOf(category).key).toBeTruthy();
    expect(() => groupOf('NOPE' as never)).toThrow('No sidebar group for NOPE');
  });
});

describe('queries: roles and category scope', () => {
  it('lists every category for Tech, passing the filter through (or an empty one)', async () => {
    (envEntryService.list as jest.Mock).mockResolvedValue(['x']);
    await expect(Q.envEntries({}, { filter: { category: 'EMAIL' } }, tech)).resolves.toEqual(['x']);
    expect(envEntryService.list).toHaveBeenCalledWith({ category: 'EMAIL' });
    await Q.envEntries({}, {}, tech);
    expect(envEntryService.list).toHaveBeenLastCalledWith({});
  });

  it('pins a channel manager to MSG91 over whatever filter they send', async () => {
    await Q.envEntries({}, { filter: { category: 'EMAIL', q: 'a' } }, comms);
    expect(envEntryService.list).toHaveBeenCalledWith({ category: 'MSG91', q: 'a' });
    await Q.envEntries({}, {}, logs);
    expect(envEntryService.list).toHaveBeenLastCalledWith({ category: 'MSG91' });
  });

  it('requires the emailed-code unlock and a permitted role', async () => {
    await expect(Q.envEntries({}, {}, nobody)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    (envAccessService.require as jest.Mock).mockRejectedValue(new Error('locked'));
    await expect(Q.envEntries({}, {}, tech)).rejects.toThrow('locked');
    expect(envEntryService.list).not.toHaveBeenCalled();
  });

  it('pages entries with the caller scope', async () => {
    await Q.envEntriesTable({}, { query: { page: 1 } }, tech);
    expect(envEntryService.table).toHaveBeenCalledWith({ page: 1 }, {});
    await Q.envEntriesTable({}, { query: { page: 2 } }, comms);
    expect(envEntryService.table).toHaveBeenLastCalledWith({ page: 2 }, { category: 'MSG91' });
  });

  it('returns a single entry for Tech, only an in-scope entry for a channel manager', async () => {
    (envEntryService.get as jest.Mock).mockResolvedValue({ category: 'EMAIL' });
    await expect(Q.envEntry({}, { id: 'e' }, tech)).resolves.toEqual({ category: 'EMAIL' });
    await expect(Q.envEntry({}, { id: 'e' }, comms)).resolves.toBeNull();
    (envEntryService.get as jest.Mock).mockResolvedValue({ category: 'MSG91' });
    await expect(Q.envEntry({}, { id: 'e' }, comms)).resolves.toEqual({ category: 'MSG91' });
    (envEntryService.get as jest.Mock).mockResolvedValue(null);
    await expect(Q.envEntry({}, { id: 'e' }, comms)).resolves.toBeNull();
  });

  it('describes every category for Tech, without needing the unlock', async () => {
    const out = await Q.envCategories({}, {}, tech);
    expect(out.map((c: any) => c.category)).toEqual([...ENV_CATEGORIES]);
    expect(envAccessService.require).not.toHaveBeenCalled();
    const email = out.find((c: any) => c.category === 'EMAIL');
    expect(email).toMatchObject({ label: 'Email (SMTP)', docUrl: 'https://support.google.com/a/answer/176600' });
    expect(email.fields).toHaveLength(CATEGORY_FIELDS.EMAIL.length);
    expect(email.fields.find((f: any) => f.name === 'port')).toMatchObject({ number: true, bool: false, secret: false });
    expect(email.fields.find((f: any) => f.name === 'secure')).toMatchObject({ bool: true });
    expect(email.fields.find((f: any) => f.name === 'password')).toMatchObject({ secret: true, hint: expect.anything() });
    expect(out.some((c: any) => c.apiDocsUrl === null)).toBe(true);
    expect(out.some((c: any) => typeof c.apiDocsUrl === 'string')).toBe(true);
    expect(out.flatMap((c: any) => c.fields).some((f: any) => f.phone === true)).toBe(true);
    expect(out.flatMap((c: any) => c.fields).some((f: any) => f.hint === null)).toBe(true);
  });

  it('describes only MSG91 for a channel manager', async () => {
    const out = await Q.envCategories({}, {}, comms);
    expect(out.map((c: any) => c.category)).toEqual(['MSG91']);
  });

  it('lists portal entries and attempt data for Tech only', async () => {
    await Q.envEntriesForPortal({}, { portalKey: 'crm' }, tech);
    expect(envEntryService.listForPortal).toHaveBeenCalledWith('crm');
    await Q.envAttemptSettings({}, {}, tech);
    expect(envAttemptService.settings).toHaveBeenCalled();
    await Q.envOverview({}, {}, tech);
    expect(envTestLogService.overview).toHaveBeenCalled();
    for (const run of [
      () => Q.envEntriesForPortal({}, { portalKey: 'crm' }, comms),
      () => Q.envAttemptSettings({}, {}, comms),
      () => Q.envOverview({}, {}, comms),
    ]) {
      await expect(run()).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    }
  });

  it('reads attempts for a manageable entry only', async () => {
    (envEntryService.get as jest.Mock).mockResolvedValue({ category: 'EMAIL' });
    await Q.envTestAttempts({}, { id: 'e' }, tech);
    expect(envAttemptService.forEntry).toHaveBeenCalledWith('e');
    await expect(Q.envTestAttempts({}, { id: 'e' }, comms)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });

  it('reports the access status without needing the unlock, for permitted roles only', async () => {
    (envAccessService.status as jest.Mock).mockResolvedValue({ unlocked: false });
    await expect(Q.envAccessStatus({}, {}, comms)).resolves.toEqual({ unlocked: false });
    expect(envAccessService.status).toHaveBeenCalledWith(comms);
    await expect(Q.envAccessStatus({}, {}, nobody)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });
});

describe('envTestHistory', () => {
  const call = (args: any, ctx = tech) => Q.envTestHistory({}, args, ctx);

  it('asks the log for Tech with the requested category', async () => {
    (envEntryService.get as jest.Mock).mockResolvedValue({ category: 'EMAIL' });
    (envTestLogService.history as jest.Mock).mockResolvedValue(['row']);
    await expect(call({ entryId: 'e', limit: 5, category: 'EMAIL' })).resolves.toEqual(['row']);
    expect(envTestLogService.history).toHaveBeenCalledWith('e', 5, 'EMAIL');
  });

  it('answers empty for an unknown entry', async () => {
    (envEntryService.get as jest.Mock).mockResolvedValue(null);
    await expect(call({ entryId: 'e' })).resolves.toEqual([]);
    expect(envTestLogService.history).not.toHaveBeenCalled();
  });

  it('confines a channel manager: another category or another category entry is empty', async () => {
    await expect(call({ category: 'EMAIL' }, comms)).resolves.toEqual([]);
    (envEntryService.get as jest.Mock).mockResolvedValue({ category: 'EMAIL' });
    await expect(call({ entryId: 'e' }, comms)).resolves.toEqual([]);
    expect(envTestLogService.history).not.toHaveBeenCalled();
  });

  it('reads their own category for a channel manager, pinning it over the argument', async () => {
    (envEntryService.get as jest.Mock).mockResolvedValue({ category: 'MSG91' });
    await call({ entryId: 'e', category: 'MSG91', limit: 3 }, comms);
    expect(envTestLogService.history).toHaveBeenCalledWith('e', 3, 'MSG91');
    await call({}, comms);
    expect(envTestLogService.history).toHaveBeenLastCalledWith(undefined, undefined, 'MSG91');
  });
});

describe('mutations: access gate', () => {
  it('requests, verifies and locks the access code for permitted roles', async () => {
    await M.requestEnvAccessCode({}, {}, comms);
    expect(envAccessService.request).toHaveBeenCalledWith(comms);
    await M.verifyEnvAccessCode({}, { challengeId: 'ch', code: '1234' }, tech);
    expect(envAccessService.verify).toHaveBeenCalledWith(tech, 'ch', '1234');
    await M.lockEnvAccess({}, {}, tech);
    expect(envAccessService.lock).toHaveBeenCalledWith(tech);
    for (const run of [
      () => M.requestEnvAccessCode({}, {}, nobody),
      () => M.verifyEnvAccessCode({}, { challengeId: 'c', code: '1' }, nobody),
      () => M.lockEnvAccess({}, {}, nobody),
    ]) {
      await expect(run()).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    }
  });
});

describe('mutations: create, update, delete', () => {
  it('coerces numbers, booleans and strings from key/value pairs and drops unknown keys', async () => {
    await M.createEnvEntry({}, {
      input: {
        name: 'Mail', category: 'EMAIL',
        config: [
          { key: 'port', value: '587' }, { key: 'secure', value: 'true' }, { key: 'host', value: 'smtp.x' }, { key: 'evil', value: 'x' },
        ],
      },
    }, tech);
    expect(envEntryService.create).toHaveBeenCalledWith({ name: 'Mail', category: 'EMAIL', config: { port: 587, secure: true, host: 'smtp.x' } });
  });

  it('keeps an empty number as empty, reads 1 as true and anything else as false', async () => {
    await M.createEnvEntry({}, {
      input: { category: 'EMAIL', config: [{ key: 'port', value: '' }, { key: 'secure', value: '1' }] },
    }, tech);
    expect((envEntryService.create as jest.Mock).mock.calls[0][0].config).toEqual({ port: '', secure: true });
    await M.createEnvEntry({}, { input: { category: 'EMAIL', config: [{ key: 'secure', value: 'no' }] } }, tech);
    expect((envEntryService.create as jest.Mock).mock.calls[1][0].config).toEqual({ secure: false });
  });

  it('creates with an empty config when none is sent', async () => {
    await M.createEnvEntry({}, { input: { category: 'EMAIL', config: null } }, tech);
    expect((envEntryService.create as jest.Mock).mock.calls[0][0].config).toEqual({});
  });

  it('lets a channel manager create MSG91 entries only', async () => {
    await M.createEnvEntry({}, { input: { category: 'MSG91', config: [] } }, comms);
    expect(envEntryService.create).toHaveBeenCalledTimes(1);
    await expect(M.createEnvEntry({}, { input: { category: 'EMAIL', config: [] } }, comms)).rejects.toMatchObject({
      message: 'Access Denied', extensions: { code: 'FORBIDDEN' },
    });
    await expect(M.createEnvEntry({}, { input: { category: 'MSG91' } }, nobody)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    expect(envEntryService.create).toHaveBeenCalledTimes(1);
  });

  it('updates with the entry own category, leaving config undefined when none is sent', async () => {
    (envEntryService.get as jest.Mock).mockResolvedValue({ category: 'EMAIL' });
    await M.updateEnvEntry({}, { id: 'e', input: { name: 'N', config: [{ key: 'port', value: '25' }] } }, tech);
    expect(envEntryService.update).toHaveBeenCalledWith('e', { name: 'N', config: { port: 25 } });
    await M.updateEnvEntry({}, { id: 'e', input: { name: 'N' } }, tech);
    expect(envEntryService.update).toHaveBeenLastCalledWith('e', { name: 'N', config: undefined });
  });

  it('refuses to update an entry of another category for a channel manager, and falls back to EMAIL fields when the entry is gone', async () => {
    (envEntryService.get as jest.Mock).mockResolvedValue({ category: 'EMAIL' });
    await expect(M.updateEnvEntry({}, { id: 'e', input: {} }, comms)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    (envEntryService.get as jest.Mock).mockResolvedValue(null);
    await M.updateEnvEntry({}, { id: 'gone', input: { config: [{ key: 'port', value: '1' }] } }, tech);
    expect(envEntryService.update).toHaveBeenCalledWith('gone', { config: { port: 1 } });
  });

  it('deletes, sets default and tests an entry through the manage gate', async () => {
    (envEntryService.get as jest.Mock).mockResolvedValue({ category: 'MSG91' });
    await M.deleteEnvEntry({}, { id: 'e' }, comms);
    expect(envEntryService.remove).toHaveBeenCalledWith('e');
    await M.setDefaultEnvEntry({}, { id: 'e' }, comms);
    expect(envEntryService.setDefault).toHaveBeenCalledWith('e');
    await M.testEnvEntry({}, { id: 'e' }, comms);
    expect(envEntryService.test).toHaveBeenCalledWith('e', 'c1');
    (envEntryService.get as jest.Mock).mockResolvedValue({ category: 'EMAIL' });
    await expect(M.deleteEnvEntry({}, { id: 'e' }, comms)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });
});

describe('mutations: Tech-only operations', () => {
  it('updates attempt settings, portal assignments and imports through the Tech gate', async () => {
    await M.updateEnvAttemptSettings({}, { input: { window_hours: 24, limits: [] } }, tech);
    expect(envAttemptService.updateSettings).toHaveBeenCalledWith({ window_hours: 24, limits: [] });
    await M.setPortalEnvEntries({}, { portalKey: 'crm', entryIds: ['a'] }, tech);
    expect(envEntryService.setPortalAssignments).toHaveBeenCalledWith('crm', ['a']);
    await M.importEnvEntries({}, {
      entries: [{ name: 'A', category: 'EMAIL', config: [{ key: 'port', value: '465' }, { key: 'unknown', value: 'x' }] }],
    }, tech);
    expect(envEntryService.importEntries).toHaveBeenCalledWith([{ name: 'A', category: 'EMAIL', config: { port: 465 } }]);
    for (const run of [
      () => M.updateEnvAttemptSettings({}, { input: {} }, comms),
      () => M.setPortalEnvEntries({}, { portalKey: 'x', entryIds: [] }, comms),
      () => M.importEnvEntries({}, { entries: [] }, comms),
    ]) {
      await expect(run()).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    }
  });

  it.each([
    ['testEnvEmail', 'email', { id: 'e', to: 'a@b.com' }, ['e', 'a@b.com', 't1']],
    ['testEnvImagekitUpload', 'imagekitUpload', { id: 'e', fileBase64: 'AA', fileName: 'f' }, ['e', 'AA', 'f', 't1']],
    ['testEnvPexels', 'pexels', { id: 'e', query: 'q' }, ['e', 'q', 't1']],
    ['testEnvTwilioCall', 'twilioCall', { id: 'e', to: '+1' }, ['e', '+1', 't1']],
    ['testEnvOpenai', 'openai', { id: 'e', prompt: 'p' }, ['e', 'p', 't1']],
    ['testEnvGemini', 'gemini', { id: 'e', prompt: 'p' }, ['e', 'p', 't1']],
  ])('%s runs the live test for the signed-in Tech user only', async (mutation, test, args, expected) => {
    await M[mutation]({}, args, tech);
    expect((envEntryTests as any)[test]).toHaveBeenCalledWith(...expected);
    await expect(M[mutation]({}, args, comms)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });
});

describe('mutations: tests reachable by a channel manager', () => {
  it('runs a connection test with the typed number, or none, and the caller id', async () => {
    (envEntryService.get as jest.Mock).mockResolvedValue({ category: 'MSG91' });
    await M.testEnvConnection({}, { id: 'e', input: { to: '99' } }, comms);
    expect(envEntryTests.connection).toHaveBeenCalledWith('e', '99', 'c1');
    await M.testEnvConnection({}, { id: 'e' }, comms);
    expect(envEntryTests.connection).toHaveBeenLastCalledWith('e', undefined, 'c1');
    await M.testEnvConnection({}, { id: 'e', input: null }, comms);
    expect(envEntryTests.connection).toHaveBeenLastCalledWith('e', undefined, 'c1');
  });

  it('runs an MSG91 widget step through the manage gate', async () => {
    (envEntryService.get as jest.Mock).mockResolvedValue({ category: 'MSG91' });
    await M.testEnvMsg91({}, { id: 'e', input: { action: 'SEND_OTP' } }, comms);
    expect(envEntryTests.msg91).toHaveBeenCalledWith('e', { action: 'SEND_OTP' }, 'c1');
    (envEntryService.get as jest.Mock).mockResolvedValue({ category: 'EMAIL' });
    await expect(M.testEnvMsg91({}, { id: 'e', input: {} }, comms)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });
});
