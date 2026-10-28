import { describe, expect, it } from 'vitest';
import type { LiteEnvCategoryDef, LiteEnvEntry } from '../../../../graphql/environment';
import { emptyEnvValues, envValuesFrom, makeEnvEntrySchema, secretPresent, toEnvInput, type EnvEntryFormValues } from '../../../../pages/environment/env-entry';
import { emailCategory, makeEnvEntry, makeField, msg91Category } from '../../../fixtures';
import { portalT } from '../../../test-utils';

const values = (config: Record<string, string>, over: Partial<EnvEntryFormValues> = {}): EnvEntryFormValues => ({ ...emptyEnvValues(), name: 'Primary SMTP', config, ...over });

/** Every message the schema reports, keyed by its dotted path. */
const issues = (def: LiteEnvCategoryDef, initial: LiteEnvEntry | null, input: EnvEntryFormValues): Record<string, string> =>
  Object.fromEntries((makeEnvEntrySchema(portalT, def, initial).safeParse(input).error?.issues ?? []).map((issue) => [issue.path.join('.'), issue.message]));

describe('env entry form values', () => {
  it('starts a new entry active, not default, with no config', () => {
    expect(emptyEnvValues()).toEqual({ name: '', description: '', is_default: false, is_active: true, config: {} });
  });

  it('reads the stored pairs into a map and an absent description as blank', () => {
    expect(envValuesFrom(makeEnvEntry({ description: null, is_default: true }))).toEqual({
      name: 'Primary SMTP',
      description: '',
      is_default: true,
      is_active: true,
      config: { host: 'smtp.example.com', port: '587', secure: 'true' },
    });
  });
});

describe('secretPresent', () => {
  const password = makeField({ name: 'password', secret: true });

  it('is true only when the server flags has_<name> as present', () => {
    expect(secretPresent(makeEnvEntry(), password)).toBe(true);
    expect(secretPresent(makeEnvEntry({ secrets: [{ key: 'has_password', present: false }] }), password)).toBe(false);
    expect(secretPresent(makeEnvEntry({ secrets: [{ key: 'has_auth_key', present: true }] }), password)).toBe(false);
  });

  it('is false for an entry that does not exist yet', () => {
    expect(secretPresent(null, password)).toBe(false);
  });
});

describe('toEnvInput', () => {
  it('trims everything, keeps a typed secret and writes booleans as true/false', () => {
    const input = toEnvInput(emailCategory(), values({ host: ' smtp.example.com ', port: ' 465 ', password: ' s3cret ', secure: 'true' }, { name: ' Primary ', description: ' Relay ' }));
    expect(input).toEqual({
      name: 'Primary',
      description: 'Relay',
      is_default: false,
      is_active: true,
      config: [
        { key: 'host', value: 'smtp.example.com' },
        { key: 'port', value: '465' },
        { key: 'password', value: 's3cret' },
        { key: 'secure', value: 'true' },
      ],
    });
  });

  it('leaves a blank secret out so the stored one is kept, and sends an unset switch as false', () => {
    const input = toEnvInput(emailCategory(), values({ host: 'smtp.example.com', password: '   ' }));
    expect(input.config).toEqual([
      { key: 'host', value: 'smtp.example.com' },
      { key: 'port', value: '' },
      { key: 'secure', value: 'false' },
    ]);
  });

  it('sends only the fields the category defines', () => {
    const input = toEnvInput(msg91Category(), values({ widget_id: 'w-1', auth_key: 'k', default_country_code: '91', host: 'stray' }));
    expect(input.config?.map((pair) => pair.key)).toEqual(['widget_id', 'auth_key', 'default_country_code']);
  });
});

describe('makeEnvEntrySchema', () => {
  it('requires a name of at most 80 characters and caps the description at 200', () => {
    expect(issues(emailCategory(), makeEnvEntry(), values({}, { name: '' })).name).toBe('Name is required');
    expect(issues(emailCategory(), makeEnvEntry(), values({}, { name: 'n'.repeat(81) })).name).toBe('Name must be 80 characters or fewer');
    expect(issues(emailCategory(), makeEnvEntry(), values({}, { description: 'd'.repeat(201) })).description).toBe('Description must be 200 characters or fewer');
  });

  it('requires every secret on a new entry', () => {
    expect(issues(emailCategory(), null, values({ password: '' }))['config.password']).toBe('Password is required');
    expect(issues(emailCategory(), null, values({ password: 'pw' }))['config.password']).toBeUndefined();
  });

  it('lets an edit keep a stored secret by leaving it blank, but not one that was never stored', () => {
    expect(issues(emailCategory(), makeEnvEntry(), values({ password: '' }))['config.password']).toBeUndefined();
    const withoutSecret = makeEnvEntry({ secrets: [{ key: 'has_password', present: false }] });
    expect(issues(emailCategory(), withoutSecret, values({ password: '' }))['config.password']).toBe('Password is required');
  });

  it('holds the SMTP port to 1..65535 whole numbers, blank allowed', () => {
    const port = (raw: string) => issues(emailCategory(), makeEnvEntry(), values({ port: raw }))['config.port'];
    for (const good of ['', '1', '587', '65535']) expect(port(good), good).toBeUndefined();
    expect(port('0')).toBe('Port must be 1 or more');
    expect(port('65536')).toBe('Port must be 65535 or less');
    expect(port('-25')).toBe('Port cannot be negative');
    expect(port('5.5')).toBe('Port must be a whole number');
  });

  it("holds MSG91's default country code to 1..9999 and requires its auth key", () => {
    const code = (raw: string) => issues(msg91Category(), null, values({ auth_key: 'key', default_country_code: raw }))['config.default_country_code'];
    expect(code('91')).toBeUndefined();
    expect(code('9999')).toBeUndefined();
    expect(code('0')).toBe('Default Country Code must be 1 or more');
    expect(code('10000')).toBe('Default Country Code must be 9999 or less');
    expect(issues(msg91Category(), null, values({}))['config.auth_key']).toBe('Auth Key is required');
  });

  it('bounds a number field without its own limits to non-negative whole numbers', () => {
    const def: LiteEnvCategoryDef = { category: 'IMAGEKIT', label: 'ImageKit', docUrl: null, fields: [makeField({ name: 'retries', label: 'Retries', number: true })] };
    expect(issues(def, null, values({ retries: '0' }))['config.retries']).toBeUndefined();
    expect(issues(def, null, values({ retries: '900719925474099' }))['config.retries']).toBeUndefined();
    expect(issues(def, null, values({ retries: '-1' }))['config.retries']).toBe('Retries cannot be negative');
  });

  it('does not number-check a text field', () => {
    expect(issues(emailCategory(), makeEnvEntry(), values({ host: '-5.5' }))['config.host']).toBeUndefined();
  });
});
