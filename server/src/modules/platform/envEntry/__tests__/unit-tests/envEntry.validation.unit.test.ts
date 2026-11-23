import { assertValidEnvConfig, checkEnvValue, validateEnvConfig } from '../../envEntry.validation';
import type { EnvFieldDef, EnvFieldValidation } from '../../envEntry.fields';

const rule = (type: EnvFieldValidation['type'], extra: Partial<EnvFieldValidation> = {}): EnvFieldValidation => ({ type, ...extra });
const field = (name: string, label: string, validation: EnvFieldValidation): EnvFieldDef => ({
  name,
  label,
  description: `${label} is used`,
  validation,
  usedIn: [],
});
const FINGERPRINT = Array.from({ length: 32 }, () => 'AB').join(':');

describe('checkEnvValue', () => {
  it('passes any text for a text field', () => {
    expect(checkEnvValue('anything at all', rule('text'))).toBeNull();
  });

  it('url: only a full http(s) address', () => {
    expect(checkEnvValue('https://api.example.com/v1', rule('url'))).toBeNull();
    expect(checkEnvValue(' http://localhost:2001 ', rule('url'))).toBeNull();
    expect(checkEnvValue('api.example.com', rule('url'))).toBe('must be a full URL, e.g. https://example.com');
    expect(checkEnvValue('ftp://example.com', rule('url'))).toBe('must start with https://');
  });

  it('hostname: a bare host — no scheme, port, path or spaces', () => {
    expect(checkEnvValue('smtp.gmail.com', rule('hostname'))).toBeNull();
    expect(checkEnvValue('localhost', rule('hostname'))).toBeNull();
    for (const bad of ['https://smtp.gmail.com', 'smtp.gmail.com:587', 'smtp', 'smtp .gmail.com', 'smtp.gmail.com/x']) {
      expect(checkEnvValue(bad, rule('hostname'))).toMatch(/host name/);
    }
  });

  it('email: one address, or the Name <address> header form', () => {
    expect(checkEnvValue('no-reply@duncit.com', rule('email'))).toBeNull();
    expect(checkEnvValue('Duncit <no-reply@duncit.com>', rule('email'))).toBeNull();
    for (const bad of ['no-reply@duncit', '@duncit.com', 'a@b@duncit.com', 'a@.duncit.com', 'a@duncit.com.', 'a b@duncit.com']) {
      expect(checkEnvValue(bad, rule('email'))).toMatch(/email address/);
    }
  });

  it('phone: E.164 only', () => {
    expect(checkEnvValue('+14155552671', rule('phone'))).toBeNull();
    for (const bad of ['14155552671', '+0123456789', '+1-415-555', '+123', '+1234567890123456']) {
      expect(checkEnvValue(bad, rule('phone'))).toMatch(/E\.164/);
    }
  });

  it('number: finite and within bounds, whether it arrives as a number or a string', () => {
    expect(checkEnvValue(587, rule('number', { min: 1, max: 65535 }))).toBeNull();
    expect(checkEnvValue('587', rule('number', { min: 1, max: 65535 }))).toBeNull();
    expect(checkEnvValue(Number.NaN, rule('number'))).toBe('must be a number');
    expect(checkEnvValue(0, rule('number', { min: 1 }))).toBe('must be at least 1');
    expect(checkEnvValue(241, rule('number', { max: 240 }))).toBe('must be at most 240');
  });

  it('json: a whole JSON object', () => {
    expect(checkEnvValue('{"type":"service_account"}', rule('json'))).toBeNull();
    expect(checkEnvValue('[1,2]', rule('json'))).toBe('must be a JSON object');
    expect(checkEnvValue('{not json', rule('json'))).toMatch(/valid JSON/);
  });

  it('pem: BEGIN and END lines included', () => {
    expect(checkEnvValue('-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----', rule('pem'))).toBeNull();
    expect(checkEnvValue('abc', rule('pem'))).toMatch(/BEGIN and END/);
  });

  it('list: no empty items', () => {
    expect(checkEnvValue('turn:a.example.com:3478,turns:a.example.com:5349', rule('list'))).toBeNull();
    expect(checkEnvValue('turn:a.example.com:3478,,', rule('list'))).toMatch(/no empty items/);
  });

  it('fingerprints: 32-byte SHA-256 fingerprints, comma separated, any case', () => {
    expect(checkEnvValue(FINGERPRINT, rule('fingerprints'))).toBeNull();
    expect(checkEnvValue(`${FINGERPRINT}, ${FINGERPRINT.toLowerCase()}`, rule('fingerprints'))).toBeNull();
    expect(checkEnvValue('AB:CD', rule('fingerprints'))).toMatch(/SHA-256/);
    expect(checkEnvValue(FINGERPRINT.replace('AB', 'ZZ'), rule('fingerprints'))).toMatch(/SHA-256/);
  });

  it('ignores a boolean for a text-shaped rule (bool fields are coerced before this)', () => {
    expect(checkEnvValue(true, rule('url'))).toBeNull();
    expect(checkEnvValue(false, rule('bool'))).toBeNull();
  });
});

describe('validateEnvConfig', () => {
  const fields = [
    field('host', 'SMTP Host', rule('hostname')),
    field('port', 'Port', rule('number', { min: 1, max: 65535 })),
    field('password', 'Password', rule('text', { required: true })),
  ];

  it('requires the required fields only when creating', () => {
    expect(validateEnvConfig(fields, { host: 'smtp.test' }, { creating: true })).toEqual([{ field: 'password', message: 'Password is required' }]);
    expect(validateEnvConfig(fields, { host: 'smtp.test', password: '   ' }, { creating: true })).toEqual([{ field: 'password', message: 'Password is required' }]);
    expect(validateEnvConfig(fields, { host: 'smtp.test' }, { creating: false })).toEqual([]);
  });

  it('reports every bad value with its label and ignores keys the category does not define', () => {
    expect(validateEnvConfig(fields, { host: 'https://x', port: 0, password: 'p', unknown: 'zz' }, { creating: true })).toEqual([
      { field: 'host', message: 'SMTP Host must be a host name such as smtp.example.com — no https:// or path' },
      { field: 'port', message: 'Port must be at least 1' },
    ]);
  });

  it('passes a valid config', () => {
    expect(validateEnvConfig(fields, { host: 'smtp.test', port: 587, password: 'p' }, { creating: true })).toEqual([]);
  });
});

describe('assertValidEnvConfig', () => {
  const fields = [field('url_endpoint', 'URL Endpoint', rule('url')), field('private_key', 'Private Key', rule('text', { required: true }))];

  it('does nothing for a valid config', () => {
    expect(() => assertValidEnvConfig(fields, { url_endpoint: 'https://ik.imagekit.io/x', private_key: 'k' }, { creating: true })).not.toThrow();
  });

  it('throws BAD_USER_INPUT naming the first bad field and listing them all', () => {
    let thrown: unknown;
    try {
      assertValidEnvConfig(fields, { url_endpoint: 'ik.imagekit.io' }, { creating: true });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({
      message: 'URL Endpoint must be a full URL, e.g. https://example.com',
      extensions: {
        code: 'BAD_USER_INPUT',
        field: 'config.url_endpoint',
        errors: [
          { field: 'url_endpoint', message: 'URL Endpoint must be a full URL, e.g. https://example.com' },
          { field: 'private_key', message: 'Private Key is required' },
        ],
      },
    });
  });
});
