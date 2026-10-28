import { describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { decodeAuthUser, decodeToken, signToken } from '../../utils/token';

vi.mock('../../config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/env')>();
  return { ...actual, env: { ...actual.env, jwtSecret: 'lite-test-jwt-secret' } };
});

const SECRET = 'lite-test-jwt-secret';
const account = { _id: '507f1f77bcf86cd799439011', email: 'priya@duncit.com', is_admin: true };

describe('signToken / decodeToken', () => {
  it('round-trips the account id, email and admin flag', () => {
    expect(decodeToken(signToken(account))).toEqual({ id: '507f1f77bcf86cd799439011', email: 'priya@duncit.com', is_admin: true });
  });

  it('signs a phone-only account with an empty email', () => {
    expect(decodeToken(signToken({ _id: 'abc', email: undefined, is_admin: false }))).toEqual({ id: 'abc', email: '', is_admin: false });
  });

  it('lasts 90 days', () => {
    const claims = jwt.decode(signToken(account));
    if (!claims || typeof claims === 'string') throw new Error('expected claims');
    expect((claims.exp ?? 0) - (claims.iat ?? 0)).toBe(90 * 24 * 60 * 60);
  });

  it('answers null for no token, a tampered token, another secret or an expired token', () => {
    const [header, , signature] = signToken({ ...account, is_admin: false }).split('.');
    const forgedClaims = Buffer.from(JSON.stringify({ sub: account._id, email: account.email, admin: true })).toString('base64url');
    expect(decodeToken(null)).toBeNull();
    expect(decodeToken('')).toBeNull();
    expect(decodeToken([header, forgedClaims, signature].join('.'))).toBeNull();
    expect(decodeToken(jwt.sign({ sub: 'x', email: '', admin: true }, 'someone-else'))).toBeNull();
    expect(decodeToken(jwt.sign({ sub: 'x', email: '', admin: false }, SECRET, { expiresIn: -10 }))).toBeNull();
  });

  it('treats a missing admin claim as not an admin', () => {
    expect(decodeToken(jwt.sign({ sub: 'x', email: 'a@b.co' }, SECRET))).toEqual({ id: 'x', email: 'a@b.co', is_admin: false });
  });
});

describe('decodeAuthUser', () => {
  it('reads a Bearer header only', () => {
    const token = signToken(account);
    expect(decodeAuthUser(`Bearer ${token}`)?.id).toBe('507f1f77bcf86cd799439011');
    expect(decodeAuthUser(`Token ${token}`)).toBeNull();
    expect(decodeAuthUser(token)).toBeNull();
    expect(decodeAuthUser(undefined)).toBeNull();
    expect(decodeAuthUser(null)).toBeNull();
  });
});
