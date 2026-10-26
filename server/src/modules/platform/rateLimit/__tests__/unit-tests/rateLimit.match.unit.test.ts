import { globMatches, ipListed, isExempt, limitKey, normaliseApp, normaliseSurface, ruleMatches } from '../../rateLimit.match';
import type { IRateLimitRule } from '../../rateLimit.model';
import type { RateLimitRequest } from '../../rateLimit.types';

const rule = (over: Partial<IRateLimitRule> = {}): IRateLimitRule =>
  ({
    enabled: true, channel: 'ALL', surface: 'ALL', app: '*', audience: 'ALL', operation_type: 'ALL', operations: [], paths: [], methods: [],
    key_by: 'IP', exempt_roles: [], exempt_ips: [], ...over,
  }) as unknown as IRateLimitRule;

const req = (over: Partial<RateLimitRequest> = {}): RateLimitRequest => ({
  channel: 'GRAPHQL', surface: 'MWEB', app: 'duncit', ip: '10.1.2.3', roles: [], ...over,
});

describe('normaliseSurface', () => {
  it('accepts a known surface in any case and trims it', () => {
    expect(normaliseSurface(' mweb ')).toBe('MWEB');
    expect(normaliseSurface('Admin_Portal')).toBe('ADMIN_PORTAL');
  });

  it('files anything else, or nothing, under UNKNOWN', () => {
    expect(normaliseSurface('desktop')).toBe('UNKNOWN');
    expect(normaliseSurface(null)).toBe('UNKNOWN');
    expect(normaliseSurface(undefined)).toBe('UNKNOWN');
    expect(normaliseSurface('')).toBe('UNKNOWN');
  });
});

describe('normaliseApp', () => {
  it('lower-cases and keeps a clean key', () => {
    expect(normaliseApp(' Duncit-Admin ')).toBe('duncit-admin');
    expect(normaliseApp('a1')).toBe('a1');
  });

  it('turns blanks and unsafe values into a dash, and caps the length at forty', () => {
    expect(normaliseApp('')).toBe('-');
    expect(normaliseApp(null)).toBe('-');
    expect(normaliseApp(undefined)).toBe('-');
    expect(normaliseApp('-leading')).toBe('-');
    expect(normaliseApp('has space')).toBe('-');
    expect(normaliseApp('a'.repeat(60))).toBe('a'.repeat(40));
  });
});

describe('globMatches', () => {
  it('treats an empty pattern or a lone star as everything', () => {
    expect(globMatches('', 'x')).toBe(true);
    expect(globMatches('  ', 'x')).toBe(true);
    expect(globMatches('*', 'anything')).toBe(true);
  });

  it('compares a pattern without a star exactly, ignoring case', () => {
    expect(globMatches('/Upload', '/upload')).toBe(true);
    expect(globMatches('/upload', '/uploads-admin')).toBe(false);
  });

  it('expands the star anywhere, anchored at both ends and case-insensitive', () => {
    expect(globMatches('/upload*', '/UPLOAD/avatar')).toBe(true);
    expect(globMatches('*/avatar', '/upload/avatar')).toBe(true);
    expect(globMatches('/a*c', '/abbbc')).toBe(true);
    expect(globMatches('/a*c', '/abbbcd')).toBe(false);
    expect(globMatches('10.1.2.*', '10.1.2.77')).toBe(true);
    expect(globMatches('10.1.2.*', '10.1.20.7')).toBe(false);
  });

  it('never lets a regex metacharacter in a pattern act as one', () => {
    expect(globMatches('a.b*', 'axb')).toBe(false);
    expect(globMatches('a.b*', 'a.bc')).toBe(true);
    expect(globMatches('(x)*', '(x)y')).toBe(true);
    expect(globMatches('[a]+*', 'aa')).toBe(false);
  });
});

describe('ruleMatches: the common gates', () => {
  it('ignores a disabled rule', () => {
    expect(ruleMatches(rule({ enabled: false }), req())).toBe(false);
  });

  it('respects channel, surface and app', () => {
    expect(ruleMatches(rule({ channel: 'REST' }), req())).toBe(false);
    expect(ruleMatches(rule({ channel: 'GRAPHQL' }), req())).toBe(true);
    expect(ruleMatches(rule({ surface: 'PORTAL' }), req())).toBe(false);
    expect(ruleMatches(rule({ surface: 'MWEB' }), req())).toBe(true);
    expect(ruleMatches(rule({ app: 'admin*' }), req())).toBe(false);
    expect(ruleMatches(rule({ app: 'dun*' }), req())).toBe(true);
  });

  it('respects the audience', () => {
    expect(ruleMatches(rule({ audience: 'ANONYMOUS' }), req())).toBe(true);
    expect(ruleMatches(rule({ audience: 'ANONYMOUS' }), req({ userId: 'u1' }))).toBe(false);
    expect(ruleMatches(rule({ audience: 'AUTHENTICATED' }), req({ userId: 'u1' }))).toBe(true);
    expect(ruleMatches(rule({ audience: 'AUTHENTICATED' }), req())).toBe(false);
    expect(ruleMatches(rule({ audience: 'ALL' }), req({ userId: 'u1' }))).toBe(true);
  });
});

describe('ruleMatches: GraphQL requests', () => {
  it('does not apply a rule that names REST paths', () => {
    expect(ruleMatches(rule({ paths: ['/upload*'] }), req())).toBe(false);
  });

  it('narrows by operation kind', () => {
    expect(ruleMatches(rule({ operation_type: 'MUTATION' }), req({ operationType: 'QUERY' }))).toBe(false);
    expect(ruleMatches(rule({ operation_type: 'MUTATION' }), req({ operationType: 'MUTATION' }))).toBe(true);
    expect(ruleMatches(rule({ operation_type: 'ALL' }), req({ operationType: 'SUBSCRIPTION' }))).toBe(true);
  });

  it('matches when any selected field is named, falling back to the first operation, then to nothing', () => {
    const named = rule({ operations: ['login*'] });
    expect(ruleMatches(named, req({ fields: ['me', 'loginWithOtp'] }))).toBe(true);
    expect(ruleMatches(named, req({ fields: ['me', 'pods'] }))).toBe(false);
    expect(ruleMatches(named, req({ fields: [], operation: 'login' }))).toBe(true);
    expect(ruleMatches(named, req({ operation: 'pods' }))).toBe(false);
    expect(ruleMatches(named, req())).toBe(false);
    expect(ruleMatches(rule({ operations: [] }), req())).toBe(true);
  });
});

describe('ruleMatches: REST and socket requests', () => {
  const rest = (over: Partial<RateLimitRequest> = {}) => req({ channel: 'REST', path: '/upload/avatar', method: 'post', ...over });

  it('does not apply a rule that names GraphQL operations', () => {
    expect(ruleMatches(rule({ operations: ['me'] }), rest())).toBe(false);
  });

  it('matches by path glob and by method regardless of case', () => {
    expect(ruleMatches(rule({ paths: ['/upload*'], methods: ['POST'] }), rest())).toBe(true);
    expect(ruleMatches(rule({ paths: ['/upload*'], methods: ['post'] }), rest())).toBe(true);
    expect(ruleMatches(rule({ paths: ['/other'] }), rest())).toBe(false);
    expect(ruleMatches(rule({ paths: ['/upload*'], methods: ['GET'] }), rest())).toBe(false);
  });

  it('needs a path to match a rule that names paths, and a method to match one that names methods', () => {
    expect(ruleMatches(rule({ paths: ['/upload*'] }), rest({ path: undefined }))).toBe(false);
    expect(ruleMatches(rule({ methods: ['GET'] }), rest({ method: undefined }))).toBe(false);
    expect(ruleMatches(rule({}), rest({ path: undefined, method: undefined }))).toBe(true);
  });
});

describe('limitKey', () => {
  it.each([
    ['IP', {}, null],
    ['IP', { ip: '1.1.1.1' }, 'ip:1.1.1.1'],
    ['USER', {}, null],
    ['USER', { userId: 'u1' }, 'user:u1'],
    ['DEVICE', {}, null],
    ['DEVICE', { deviceId: 'd1' }, 'device:d1'],
    ['API_KEY', {}, null],
    ['API_KEY', { apiKeyId: 'k1' }, 'key:k1'],
    ['IP_USER', { userId: 'u1', ip: '1.1.1.1' }, 'user:u1'],
    ['IP_USER', { ip: '1.1.1.1' }, 'ip:1.1.1.1'],
    ['IP_USER', {}, null],
    ['SYSTEM', {}, 'sys:MWEB:duncit'],
    ['GLOBAL', {}, 'all'],
  ])('keys a %s rule for %j as %p', (keyBy, extra, expected) => {
    expect(limitKey(rule({ key_by: keyBy as never }), req({ ip: '', ...extra }))).toBe(expected);
  });
});

describe('isExempt', () => {
  it('exempts a caller holding a role from the rule or from the global list', () => {
    expect(isExempt(rule({ exempt_roles: ['SUPPORT'] }), req({ roles: ['SUPPORT'] }), [])).toBe(true);
    expect(isExempt(rule(), req({ roles: ['SUPER_ADMIN'] }), ['SUPER_ADMIN'])).toBe(true);
    expect(isExempt(rule({ exempt_roles: ['SUPPORT'] }), req({ roles: ['USER'] }), ['SUPER_ADMIN'])).toBe(false);
  });

  it('exempts a listed address, globs included', () => {
    expect(isExempt(rule({ exempt_ips: ['10.1.2.*'] }), req(), [])).toBe(true);
    expect(isExempt(rule({ exempt_ips: ['10.9.*'] }), req(), [])).toBe(false);
    expect(isExempt(rule(), req(), [])).toBe(false);
  });
});

describe('ipListed', () => {
  it('matches an address against exact entries and globs', () => {
    expect(ipListed(['1.2.3.4', '10.0.0.*'], '10.0.0.9')).toBe(true);
    expect(ipListed(['1.2.3.4'], '1.2.3.5')).toBe(false);
    expect(ipListed([], '1.2.3.4')).toBe(false);
  });
});
