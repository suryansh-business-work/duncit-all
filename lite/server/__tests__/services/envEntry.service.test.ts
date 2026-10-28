import { describe, expect, it } from 'vitest';
import { LiteEnvEntryModel } from '../../models/envEntry.model';
import { envEntryService, readString } from '../../services/envEntry.service';
import { apiError, badInputError } from '../helpers/expect';
import { withTestDatabase } from '../helpers/mongo';

withTestDatabase();

const pairs = (values: Record<string, string>) => Object.entries(values).map(([key, value]) => ({ key, value }));
const valueOf = (entry: { config: { key: string; value: string }[] }, key: string) => entry.config.find((pair) => pair.key === key)?.value;

const smtp = (name: string, extra: Record<string, string> = {}) =>
  envEntryService.create({
    name,
    category: 'EMAIL',
    config: pairs({ host: ' smtp.duncit.com ', port: '587', user: 'mailer@duncit.com', password: 'app-password', from_address: 'no-reply@duncit.com', ...extra }),
  });

describe('envEntryService.categories', () => {
  it('lists every category with its fields, including Google Maps and MSG91', () => {
    const categories = envEntryService.categories();
    expect(categories.map((c) => c.category)).toEqual(['EMAIL', 'IMAGEKIT', 'GOOGLE_OAUTH', 'GOOGLE_MAPS', 'MSG91', 'PEXELS']);
    const maps = categories.find((c) => c.category === 'GOOGLE_MAPS');
    expect(maps?.label).toBe('Google Maps');
    expect(maps?.fields.map((f) => f.name)).toEqual(['api_key', 'map_id']);
  });

  it('gives number fields their bounds and marks secrets, with every flag a boolean', () => {
    const categories = envEntryService.categories();
    const msg91 = categories.find((c) => c.category === 'MSG91');
    expect(msg91?.fields.find((f) => f.name === 'default_country_code')).toMatchObject({ number: true, min: 1, max: 9999, secret: false, bool: false });
    expect(msg91?.fields.find((f) => f.name === 'auth_key')).toMatchObject({ secret: true, number: false });
    const email = categories.find((c) => c.category === 'EMAIL');
    expect(email?.fields.find((f) => f.name === 'port')).toMatchObject({ number: true, min: 1, max: 65_535 });
    expect(email?.fields.find((f) => f.name === 'secure')).toMatchObject({ bool: true });
    expect(email?.fields.find((f) => f.name === 'from_name')?.hint).toBeNull();
  });
});

describe('envEntryService.create', () => {
  it('makes the first entry of a category its default, typing and trimming the config', async () => {
    const entry = await smtp('Primary mailbox', { secure: 'true' });
    expect(entry).toMatchObject({ name: 'Primary mailbox', category: 'EMAIL', is_default: true, is_active: true, last_tested_at: null, last_test_ok: null });
    expect(valueOf(entry, 'host')).toBe('smtp.duncit.com');
    expect(valueOf(entry, 'port')).toBe('587');
    expect(valueOf(entry, 'secure')).toBe('true');
    expect(valueOf(entry, 'reply_to')).toBe('');
    expect(entry.secrets).toEqual([{ key: 'has_password', present: true }]);
    const stored = await LiteEnvEntryModel.findById(entry.id).lean();
    expect(stored?.config).toMatchObject({ port: 587, secure: true, host: 'smtp.duncit.com' });
  });

  it('never sends a stored secret back, only whether one is stored', async () => {
    const entry = await smtp('Primary mailbox');
    expect(valueOf(entry, 'password')).toBe('');
    expect(JSON.stringify(entry)).not.toContain('app-password');
    expect(entry.secrets).toEqual([{ key: 'has_password', present: true }]);
    expect((await LiteEnvEntryModel.findById(entry.id).lean())?.config).toMatchObject({ password: 'app-password' });
  });

  it('keeps later entries off default unless asked, and a new default clears the old one', async () => {
    const first = await smtp('Primary');
    const second = await smtp('Backup');
    expect(second.is_default).toBe(false);

    const third = await envEntryService.create({ name: 'New primary', category: 'EMAIL', is_default: true, config: [] });
    expect(third.is_default).toBe(true);
    expect((await LiteEnvEntryModel.findById(first.id).lean())?.is_default).toBe(false);
  });

  it('only stores the fields the category defines', async () => {
    const entry = await envEntryService.create({ name: 'Maps', category: 'GOOGLE_MAPS', config: pairs({ api_key: 'AIza-1', password: 'nope', $where: 'x' }) });
    const stored = await LiteEnvEntryModel.findById(entry.id).lean();
    expect(stored?.config).toEqual({ api_key: 'AIza-1' });
  });

  it('reads a boolean field from true, 1 or on only', async () => {
    for (const [raw, expected] of [['1', true], ['on', true], ['yes', false], ['false', false]] as const) {
      const entry = await smtp(`Mailbox ${raw}`, { secure: raw });
      expect(valueOf(entry, 'secure')).toBe(String(expected));
    }
  });

  it.each([
    ['port', 'abc', 'Port must be a whole number'],
    ['port', '1.5', 'Port must be a whole number'],
    ['port', '-25', 'Port must be a whole number'],
    ['port', '0', 'Port must be at least 1'],
    ['port', '65536', 'Port cannot be more than 65535'],
  ])('refuses %s = %s', async (key, value, message) => {
    await expect(smtp('Mailbox', { [key]: value })).rejects.toMatchObject(badInputError(message));
  });

  it('bounds the default country code to 1..9999', async () => {
    const create = (code: string) => envEntryService.create({ name: 'MSG91', category: 'MSG91', config: pairs({ widget_id: 'w', auth_key: 'k', default_country_code: code }) });
    await expect(create('0')).rejects.toMatchObject(badInputError('Default Country Code must be at least 1'));
    await expect(create('10000')).rejects.toMatchObject(badInputError('Default Country Code cannot be more than 9999'));
    await expect(create('+91')).rejects.toMatchObject(badInputError('Default Country Code must be a whole number'));
    const ok = await create(' 91 ');
    expect(valueOf(ok, 'default_country_code')).toBe('91');
  });

  it('refuses an unknown category and a blank name', async () => {
    const unknown = { name: 'X', category: 'SLACK', config: [] } as unknown as Parameters<typeof envEntryService.create>[0];
    await expect(envEntryService.create(unknown)).rejects.toMatchObject(badInputError('Unknown category'));
    await expect(envEntryService.create({ name: '  ', category: 'EMAIL' })).rejects.toMatchObject(badInputError('Name is required'));
  });
});

describe('envEntryService.update', () => {
  it('keeps a stored secret when the console sends it blank, and replaces it when given', async () => {
    const entry = await smtp('Primary');
    await envEntryService.update(entry.id, { name: 'Primary', category: 'EMAIL', config: pairs({ password: '', host: 'smtp2.duncit.com' }) });
    let stored = await LiteEnvEntryModel.findById(entry.id).lean();
    expect(stored?.config).toMatchObject({ password: 'app-password', host: 'smtp2.duncit.com' });

    await envEntryService.update(entry.id, { name: 'Primary', category: 'EMAIL', config: pairs({ password: 'rotated' }) });
    stored = await LiteEnvEntryModel.findById(entry.id).lean();
    expect(stored?.config).toMatchObject({ password: 'rotated', host: 'smtp2.duncit.com' });
  });

  it('renames, re-describes and moves the default', async () => {
    const first = await smtp('Primary');
    const second = await smtp('Backup');
    const updated = await envEntryService.update(second.id, { name: 'Backup (SES)', category: 'EMAIL', description: 'Amazon SES', is_default: true, is_active: true });
    expect(updated).toMatchObject({ name: 'Backup (SES)', description: 'Amazon SES', is_default: true });
    expect((await LiteEnvEntryModel.findById(first.id).lean())?.is_default).toBe(false);
  });

  it('can switch an entry off without touching the default flag', async () => {
    const entry = await smtp('Primary');
    const updated = await envEntryService.update(entry.id, { name: 'Primary', category: 'EMAIL', is_active: false });
    expect(updated).toMatchObject({ is_active: false, is_default: true });
    await expect(envEntryService.activeConfig('EMAIL')).resolves.toBeNull();
  });

  it('answers NOT_FOUND for an unknown entry', async () => {
    await expect(envEntryService.update('507f1f77bcf86cd799439011', { name: 'X', category: 'EMAIL' })).rejects.toMatchObject(
      apiError('NOT_FOUND', 'Environment entry could not be found'),
    );
  });
});

describe('envEntryService.setDefault', () => {
  it('makes the entry the active default of its own category only', async () => {
    const primary = await smtp('Primary');
    const backup = await smtp('Backup');
    const maps = await envEntryService.create({ name: 'Maps', category: 'GOOGLE_MAPS', config: pairs({ api_key: 'AIza' }) });
    await LiteEnvEntryModel.updateOne({ _id: backup.id }, { $set: { is_active: false } });

    const result = await envEntryService.setDefault(backup.id);

    expect(result).toMatchObject({ is_default: true, is_active: true });
    expect((await LiteEnvEntryModel.findById(primary.id).lean())?.is_default).toBe(false);
    expect((await LiteEnvEntryModel.findById(maps.id).lean())?.is_default).toBe(true);
  });

  it('answers NOT_FOUND for an unknown entry', async () => {
    await expect(envEntryService.setDefault('507f1f77bcf86cd799439011')).rejects.toMatchObject(apiError('NOT_FOUND', 'Environment entry could not be found'));
  });
});

describe('envEntryService reads and housekeeping', () => {
  it('lists entries by category, the default first', async () => {
    await smtp('Zeta backup');
    await smtp('Alpha backup');
    await envEntryService.create({ name: 'Maps', category: 'GOOGLE_MAPS', config: [] });
    const all = await envEntryService.list();
    expect(all.map((e) => e.name)).toEqual(['Zeta backup', 'Alpha backup', 'Maps']);
    const email = await envEntryService.list('EMAIL');
    expect(email.map((e) => e.name)).toEqual(['Zeta backup', 'Alpha backup']);
  });

  it('returns the active default config, or null', async () => {
    await expect(envEntryService.activeConfig('IMAGEKIT')).resolves.toBeNull();
    await envEntryService.create({ name: 'IK', category: 'IMAGEKIT', config: pairs({ private_key: 'private_x', folder: '/lite' }) });
    await expect(envEntryService.activeConfig('IMAGEKIT')).resolves.toEqual({ private_key: 'private_x', folder: '/lite' });
  });

  it('stamps the result of a test', async () => {
    const entry = await smtp('Primary');
    await envEntryService.recordTest(entry.id, false);
    const [listed] = await envEntryService.list('EMAIL');
    expect(listed.last_test_ok).toBe(false);
    expect(Number.isNaN(Date.parse(String(listed.last_tested_at)))).toBe(false);
  });

  it('removes an entry once', async () => {
    const entry = await smtp('Primary');
    await expect(envEntryService.remove(entry.id)).resolves.toBe(true);
    await expect(envEntryService.remove(entry.id)).resolves.toBe(false);
  });

  it('reads one entry by id or answers NOT_FOUND', async () => {
    const entry = await smtp('Primary');
    await expect(envEntryService.byId(entry.id)).resolves.toMatchObject({ name: 'Primary', category: 'EMAIL' });
    await expect(envEntryService.byId('507f1f77bcf86cd799439011')).rejects.toMatchObject(apiError('NOT_FOUND', 'Environment entry could not be found'));
  });
});

describe('readString', () => {
  it('reads strings and numbers as trimmed text, anything else as empty', () => {
    expect(readString({ host: ' smtp ', port: 587, secure: true }, 'host')).toBe('smtp');
    expect(readString({ port: 587 }, 'port')).toBe('587');
    expect(readString({ secure: true }, 'secure')).toBe('');
    expect(readString({}, 'missing')).toBe('');
    expect(readString(null, 'host')).toBe('');
  });
});
