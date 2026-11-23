import { describe, expect, it } from 'vitest';
import { findEnvProblem, isRequiredOnCreate, validationTypeOf } from '../../src/pages/environment/env-entry/env-validation';
import { makeEnvFieldDef } from '../mocks/env-entry.mock';

const field = (type: string, extra: Record<string, unknown> = {}) =>
  makeEnvFieldDef({ name: 'f', label: 'F', validation: { type, required: false, ...extra } });
const problem = (type: string, value: string, extra: Record<string, unknown> = {}) => findEnvProblem(field(type, extra), value)?.problem ?? null;
const FINGERPRINT = Array.from({ length: 32 }, () => 'AB').join(':');

describe('findEnvProblem', () => {
  it('leaves blank values to the required rule', () => {
    expect(findEnvProblem(field('url'), '   ')).toBeNull();
  });

  it('accepts any text for a text field', () => {
    expect(problem('text', 'anything at all')).toBeNull();
  });

  it('url: wants a full http(s) address', () => {
    expect(problem('url', 'https://api.example.com/v1')).toBeNull();
    expect(problem('url', 'http://localhost:2001')).toBeNull();
    expect(problem('url', 'api.example.com')).toBe('url');
    expect(problem('url', 'ftp://example.com')).toBe('url');
  });

  it('hostname: a bare host, no scheme, port or path', () => {
    expect(problem('hostname', 'smtp.gmail.com')).toBeNull();
    expect(problem('hostname', 'localhost')).toBeNull();
    expect(problem('hostname', 'https://smtp.gmail.com')).toBe('hostname');
    expect(problem('hostname', 'smtp.gmail.com:587')).toBe('hostname');
    expect(problem('hostname', 'smtp')).toBe('hostname');
    expect(problem('hostname', 'smtp .gmail.com')).toBe('hostname');
  });

  it('email: one address, or the Name <address> header form', () => {
    expect(problem('email', 'no-reply@duncit.com')).toBeNull();
    expect(problem('email', 'Duncit <no-reply@duncit.com>')).toBeNull();
    expect(problem('email', 'no-reply@duncit')).toBe('email');
    expect(problem('email', '@duncit.com')).toBe('email');
    expect(problem('email', 'a@b@duncit.com')).toBe('email');
    expect(problem('email', 'a@.duncit.com')).toBe('email');
  });

  it('phone: E.164 only', () => {
    expect(problem('phone', '+14155552671')).toBeNull();
    expect(problem('phone', '14155552671')).toBe('phone');
    expect(problem('phone', '+0123456789')).toBe('phone');
    expect(problem('phone', '+1-415-555')).toBe('phone');
    expect(problem('phone', '+123')).toBe('phone');
  });

  it('number: finite and inside the bounds, reporting the bound it broke', () => {
    expect(problem('number', '587', { min: 1, max: 65535 })).toBeNull();
    expect(problem('number', 'abc')).toBe('number');
    expect(findEnvProblem(field('number', { min: 1 }), '0')).toEqual({ problem: 'min', bound: 1 });
    expect(findEnvProblem(field('number', { max: 240 }), '241')).toEqual({ problem: 'max', bound: 240 });
  });

  it('json: a whole JSON object', () => {
    expect(problem('json', '{"type":"service_account"}')).toBeNull();
    expect(problem('json', '[1,2]')).toBe('jsonObject');
    expect(problem('json', '{not json')).toBe('json');
  });

  it('pem: BEGIN and END lines included', () => {
    expect(problem('pem', '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----')).toBeNull();
    expect(problem('pem', 'abc')).toBe('pem');
  });

  it('list: no empty items', () => {
    expect(problem('list', 'turn:a.example.com:3478,turns:a.example.com:5349')).toBeNull();
    expect(problem('list', 'turn:a.example.com:3478,,')).toBe('list');
  });

  it('fingerprints: one or more 32-byte SHA-256 fingerprints', () => {
    expect(problem('fingerprints', FINGERPRINT)).toBeNull();
    expect(problem('fingerprints', `${FINGERPRINT}, ${FINGERPRINT.toLowerCase()}`)).toBeNull();
    expect(problem('fingerprints', 'AB:CD')).toBe('fingerprints');
    expect(problem('fingerprints', FINGERPRINT.replace('AB', 'ZZ'))).toBe('fingerprints');
  });
});

describe('validationTypeOf', () => {
  it('uses the registry type, else treats an old phone field as phone and the rest as text', () => {
    expect(validationTypeOf(field('url'))).toBe('url');
    expect(validationTypeOf(makeEnvFieldDef({ phone: true }))).toBe('phone');
    expect(validationTypeOf(makeEnvFieldDef())).toBe('text');
  });
});

describe('isRequiredOnCreate', () => {
  it('follows the registry when it says', () => {
    const required = field('text', { required: true });
    const optionalSecret = makeEnvFieldDef({ name: 's', secret: true, validation: { type: 'text', required: false } });
    expect(isRequiredOnCreate(required, [optionalSecret, required])).toBe(true);
    expect(isRequiredOnCreate(optionalSecret, [optionalSecret, required])).toBe(false);
  });

  it('falls back to the first secret field when the server sends no validation', () => {
    const first = makeEnvFieldDef({ name: 'a', secret: true });
    const second = makeEnvFieldDef({ name: 'b', secret: true });
    expect(isRequiredOnCreate(first, [first, second])).toBe(true);
    expect(isRequiredOnCreate(second, [first, second])).toBe(false);
  });
});
