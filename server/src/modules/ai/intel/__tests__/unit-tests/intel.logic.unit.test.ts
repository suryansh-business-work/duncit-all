/**
 * Chat and platform logic that decides what people see: source states,
 * citations kept, titles, rate limits, uploads, webhooks and validation.
 */
import { createHmac } from 'node:crypto';
import { validate } from '@utils/validate';
import { usedCitations } from '../../chat/intel.loop';
import { allowMinute } from '../../chat/intel.limits';
import { cleanTitle, fallbackTitle } from '../../chat/intel.title';
import { CONFIG_SCHEMAS, connectorInputSchema } from '../../connectors/intelConnector.schema';
import { htmlToText } from '../../connectors/intel.http';
import { stateOf } from '../../health/intel.health';
import { validSignature } from '../../intel.router';
import { sniffMime } from '../../media/intelMedia.extract';
import { INTEL_SETTINGS_DEFAULTS } from '../../settings/intelSettings.defaults';
import { SECTION_SCHEMAS } from '../../settings/intelSettings.schema';
import { scopeOf } from '../../connectors/intel.driver';

describe('stateOf (source cards)', () => {
  const c = (status: string, enabled = true, last_success_at: Date | null = null) => ({ status, enabled, last_success_at }) as never;
  it('is RESTRICTED when the person may not use the source, whatever the connectors say', () => {
    expect(stateOf([c('OK')], false)).toBe('RESTRICTED');
  });
  it('is DISCONNECTED with no enabled connector, and never assumes CONNECTED before a success', () => {
    expect(stateOf([], true)).toBe('DISCONNECTED');
    expect(stateOf([c('OK', false)], true)).toBe('DISCONNECTED');
    expect(stateOf([c('IDLE')], true)).toBe('DISCONNECTED');
  });
  it('reports SYNCING, then ERROR, then CONNECTED', () => {
    expect(stateOf([c('ERROR'), c('SYNCING')], true)).toBe('SYNCING');
    expect(stateOf([c('OK'), c('ERROR')], true)).toBe('ERROR');
    expect(stateOf([c('IDLE', true, new Date())], true)).toBe('CONNECTED');
  });
});

describe('usedCitations', () => {
  const cite = (ref: string) => ({ ref, title: ref, url: '', source: 'MEDIA', environment: 'SHARED', snippet: '', page: null, line_start: null, line_end: null });
  it('keeps only the sources the answer actually cites', () => {
    expect(usedCitations('Revenue rose [S2]. See also [S2] and [S3].', [cite('S1'), cite('S2'), cite('S3')]).map((c) => c.ref)).toEqual(['S2', 'S3']);
    expect(usedCitations('No sources here.', [cite('S1')])).toEqual([]);
  });
});

describe('titles', () => {
  it('falls back to the first words of the question', () => {
    expect(fallbackTitle('  Why is host   earning negative in the last test pod today?')).toBe('Why is host earning negative in the');
    expect(fallbackTitle('')).toBe('New chat');
  });
  it('cleans quotes, trailing punctuation and spacing from a model title', () => {
    expect(cleanTitle('"Pod earnings discrepancy."')).toBe('Pod earnings discrepancy');
    expect(cleanTitle('  Host   payouts  ')).toBe('Host payouts');
  });
});

describe('allowMinute', () => {
  it('allows the configured number per minute, then refuses until the window moves', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i += 1) expect(allowMinute('rate-user', 3, t0 + i)).toBe(true);
    expect(allowMinute('rate-user', 3, t0 + 10)).toBe(false);
    expect(allowMinute('rate-user', 3, t0 + 61_000)).toBe(true);
  });
});

describe('sniffMime (upload type check)', () => {
  it('trusts the bytes, not the browser', () => {
    expect(sniffMime(Buffer.from('%PDF-1.7 ...'), 'image/png')).toBe('application/pdf');
    expect(sniffMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]), 'application/pdf')).toBe('image/png');
    expect(sniffMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), '')).toBe('image/jpeg');
    expect(sniffMime(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]), '')).toBe('image/webp');
  });
  it('accepts declared text only when it contains no NUL bytes, and refuses unknown binaries', () => {
    expect(sniffMime(Buffer.from('hello,world'), 'text/csv')).toBe('text/csv');
    expect(sniffMime(Buffer.from([0x68, 0, 0x69]), 'text/plain')).toBeNull();
    expect(sniffMime(Buffer.from('MZ\x90\x00'), 'application/x-msdownload')).toBeNull();
  });
});

describe('validSignature (GitHub webhook)', () => {
  const body = Buffer.from('{"ref":"refs/heads/staging"}');
  const sign = (secret: string) => `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
  it('accepts the right signature and refuses a wrong one, a missing secret or another scheme', () => {
    expect(validSignature('s3cret', body, sign('s3cret'))).toBe(true);
    expect(validSignature('s3cret', body, sign('other'))).toBe(false);
    expect(validSignature('', body, sign(''))).toBe(false);
    expect(validSignature('s3cret', body, 'sha1=abc')).toBe(false);
  });
});

describe('htmlToText', () => {
  it('drops scripts and tags, keeps line breaks and decodes entities', () => {
    expect(htmlToText('<style>x{}</style><p>Hi&nbsp;<b>Asha</b></p><p>Pay &amp; go</p><script>alert(1)</script>')).toBe('Hi Asha\nPay & go');
  });
});

describe('settings validation', () => {
  it('accepts every shipped default', async () => {
    for (const [section, schema] of Object.entries(SECTION_SCHEMAS)) {
      await expect(validate(schema as never, INTEL_SETTINGS_DEFAULTS[section as keyof typeof INTEL_SETTINGS_DEFAULTS])).resolves.toBeDefined();
    }
  });
  it('refuses a model list without exactly one enabled default', async () => {
    await expect(validate(SECTION_SCHEMAS.models, [{ id: 'gpt-4o', label: 'A', enabled: false, is_default: true }])).rejects.toThrow('Validation failed');
  });
  it('refuses a chunk overlap of half the chunk or more', async () => {
    await expect(validate(SECTION_SCHEMAS.embeddings, { ...INTEL_SETTINGS_DEFAULTS.embeddings, chunk_overlap: 600 })).rejects.toThrow('Validation failed');
  });
  it('ships production read-only for employees and four-eyes on', () => {
    expect(INTEL_SETTINGS_DEFAULTS.access.employee.environments).toEqual(['STAGING']);
    expect(INTEL_SETTINGS_DEFAULTS.access.employee.can_request_writes).toBe(false);
    expect(INTEL_SETTINGS_DEFAULTS.security.four_eyes_production).toBe(true);
  });
});

describe('connector validation', () => {
  const base = { kind: 'MONGODB', name: 'Prod DB', environment: 'PRODUCTION', env_entry_id: '65a1b2c3d4e5f6a7b8c9d0e1', config: {} };
  it('refuses a database connection for both environments', async () => {
    await expect(validate(connectorInputSchema, { ...base, environment: 'BOTH' })).rejects.toThrow('Validation failed');
    await expect(validate(connectorInputSchema, base)).resolves.toMatchObject({ enabled: true });
  });
  it('refuses system collections and malformed GitHub repositories', async () => {
    await expect(validate(CONFIG_SCHEMAS.MONGODB, { collections: ['system.users'] })).rejects.toThrow('Validation failed');
    await expect(validate(CONFIG_SCHEMAS.GITHUB, { repos: [{ owner: 'a/b', repo: 'x', branch: 'main' }] })).rejects.toThrow('Validation failed');
    await expect(validate(CONFIG_SCHEMAS.MONGODB, {})).resolves.toEqual({ database: '', collections: [], access_mode: 'READ_ONLY' });
  });
  it('stores BOTH-environment sources in the shared scope', () => {
    expect(scopeOf('BOTH')).toBe('SHARED');
    expect(scopeOf('PRODUCTION')).toBe('PRODUCTION');
  });
});
