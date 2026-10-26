import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { decodeAuthUser } from '@context';
import { isSessionSealed, sealSessions } from '../../session-seal';

/**
 * The seal is a millisecond instant; a token's `iat` is whole seconds. The two
 * are compared at second precision, so the session a password reset opens in
 * the same second as its seal is accepted rather than refused.
 */

const newId = () => new Types.ObjectId().toHexString();

/** A seal 400ms into the second `second` (epoch seconds). */
const sealInside = (id: string, second: number) => sealSessions(id, new Date(second * 1000 + 400));

const bearer = (id: string, iat: number) =>
  `Bearer ${jwt.sign({ id, roles: ['USER'], iat }, process.env.JWT_SECRET || 'dev-secret')}`;

describe('isSessionSealed', () => {
  const second = Math.floor(Date.now() / 1000);

  it('accepts a token issued in the same second as the seal, even though its iat reads as earlier', () => {
    const id = newId();
    sealInside(id, second);
    expect(isSessionSealed(id, second)).toBe(false);
    expect(decodeAuthUser(bearer(id, second))?.id).toBe(id);
  });

  it('refuses a token issued in any earlier second', () => {
    const id = newId();
    sealInside(id, second);
    expect(isSessionSealed(id, second - 1)).toBe(true);
    expect(decodeAuthUser(bearer(id, second - 1))).toBeNull();
  });

  it('accepts a token issued after the seal second', () => {
    const id = newId();
    sealInside(id, second);
    expect(isSessionSealed(id, second + 1)).toBe(false);
  });

  it('refuses a token with no iat once the account is sealed, and ignores accounts never sealed', () => {
    const id = newId();
    sealInside(id, second);
    expect(isSessionSealed(id, undefined)).toBe(true);
    expect(isSessionSealed(newId(), second - 3600)).toBe(false);
    expect(isSessionSealed(null, second)).toBe(false);
  });
});
