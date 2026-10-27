import { describe, expect, it } from 'vitest';
import type { Types } from 'mongoose';
import { LiteOtpModel } from '../../models/otp.model';
import { CODE_TTL_MINUTES, MAX_ATTEMPTS, RESEND_AFTER_SECONDS, otpChallenge } from '../../services/otp.challenge';
import { sha256 } from '../../utils/ids';
import { badInputError } from '../helpers/expect';
import { withTestDatabase } from '../helpers/mongo';

withTestDatabase();

const priya = { email: 'priya@duncit.com' };
const phone = { phone: '+919876543210' };

/** Move a stored challenge's clock fields, bypassing Mongoose so the timestamps stay as written. */
async function backdate(id: Types.ObjectId, fields: Record<string, Date>): Promise<void> {
  await LiteOtpModel.collection.updateOne({ _id: id }, { $set: fields });
}

describe('otpChallenge.open', () => {
  it('stores one live challenge for the contact and purpose, expiring after the TTL', async () => {
    const before = Date.now();
    const challenge = await otpChallenge.open(priya, 'SIGN_IN', { via: 'LITE', code_hash: sha256('123456') });
    expect(challenge.toObject()).toMatchObject({ email: 'priya@duncit.com', purpose: 'SIGN_IN', via: 'LITE', attempts: 0, consumed_at: null });
    const ttl = challenge.expires_at.getTime() - before;
    expect(ttl).toBeGreaterThanOrEqual(CODE_TTL_MINUTES * 60_000);
    expect(ttl).toBeLessThan(CODE_TTL_MINUTES * 60_000 + 5_000);
  });

  it('honours a custom TTL and keeps the account a LINK code is for', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const before = Date.now();
    const challenge = await otpChallenge.open(phone, 'LINK', { via: 'SMS', req_id: 'req-1', user_id: userId, ttlMinutes: 3 });
    expect(String(challenge.user_id)).toBe(userId);
    expect(challenge.req_id).toBe('req-1');
    expect(challenge.expires_at.getTime() - before).toBeLessThan(3 * 60_000 + 5_000);
  });
});

describe('otpChallenge.assertCanSend', () => {
  it('allows the first code', async () => {
    await expect(otpChallenge.assertCanSend(priya, 'SIGN_IN')).resolves.toBeUndefined();
  });

  it('refuses another code inside the resend window and says how long to wait', async () => {
    await otpChallenge.open(priya, 'SIGN_IN', { via: 'LITE' });
    await expect(otpChallenge.assertCanSend(priya, 'SIGN_IN')).rejects.toMatchObject(badInputError(/^Please wait 4[45]s before asking for another code$/));
  });

  it('counts the wait from when the last code was sent', async () => {
    const challenge = await otpChallenge.open(priya, 'SIGN_IN', { via: 'LITE' });
    await backdate(challenge._id, { last_sent_at: new Date(Date.now() - 10_000) });
    await expect(otpChallenge.assertCanSend(priya, 'SIGN_IN')).rejects.toMatchObject(badInputError(/^Please wait 3[45]s/));
  });

  it('allows a new code once the window has passed', async () => {
    const challenge = await otpChallenge.open(priya, 'SIGN_IN', { via: 'LITE' });
    await backdate(challenge._id, { last_sent_at: new Date(Date.now() - (RESEND_AFTER_SECONDS + 1) * 1000) });
    await expect(otpChallenge.assertCanSend(priya, 'SIGN_IN')).resolves.toBeUndefined();
  });

  it('ignores used codes, other purposes and other contacts', async () => {
    const used = await otpChallenge.open(priya, 'SIGN_IN', { via: 'LITE' });
    await otpChallenge.consume(used);
    await otpChallenge.open(priya, 'LINK', { via: 'LITE' });
    await otpChallenge.open({ email: 'asha@duncit.com' }, 'SIGN_IN', { via: 'LITE' });
    await expect(otpChallenge.assertCanSend(priya, 'SIGN_IN')).resolves.toBeUndefined();
  });
});

describe('otpChallenge.take', () => {
  it('refuses anything that is not a 6-digit code before touching the database', async () => {
    await otpChallenge.open(priya, 'SIGN_IN', { via: 'LITE' });
    for (const code of ['12345', '1234567', 'abcdef', '', 123456, null]) {
      await expect(otpChallenge.take(priya, 'SIGN_IN', code)).rejects.toMatchObject(badInputError('Enter the 6-digit code'));
    }
    const stored = await LiteOtpModel.findOne(priya).lean();
    expect(stored?.attempts).toBe(0);
  });

  it('asks for a code first when none is live', async () => {
    await expect(otpChallenge.take(priya, 'SIGN_IN', '123456')).rejects.toMatchObject(badInputError('Ask for a new code first'));
  });

  it('refuses an expired code', async () => {
    const challenge = await otpChallenge.open(priya, 'SIGN_IN', { via: 'LITE' });
    await backdate(challenge._id, { expires_at: new Date(Date.now() - 1000) });
    await expect(otpChallenge.take(priya, 'SIGN_IN', '123456')).rejects.toMatchObject(badInputError('That code has expired. Ask for a new one'));
  });

  it('returns the trimmed code and the latest challenge, counting the guess', async () => {
    const older = await otpChallenge.open(priya, 'SIGN_IN', { via: 'LITE', code_hash: 'old' });
    await backdate(older._id, { created_at: new Date(Date.now() - 60_000) });
    const latest = await otpChallenge.open(priya, 'SIGN_IN', { via: 'LITE', code_hash: 'new' });

    const { challenge, code } = await otpChallenge.take(priya, 'SIGN_IN', ' 042042 ');

    expect(code).toBe('042042');
    expect(String(challenge._id)).toBe(String(latest._id));
    expect(challenge.attempts).toBe(1);
  });

  it(`stops after ${MAX_ATTEMPTS} guesses`, async () => {
    await otpChallenge.open(phone, 'SIGN_IN', { via: 'SMS', req_id: 'r' });
    for (let i = 1; i <= MAX_ATTEMPTS; i += 1) {
      const { challenge } = await otpChallenge.take(phone, 'SIGN_IN', '111111');
      expect(challenge.attempts).toBe(i);
    }
    await expect(otpChallenge.take(phone, 'SIGN_IN', '111111')).rejects.toMatchObject(badInputError('Too many tries. Ask for a new code'));
  });

  it('counts parallel guesses atomically, so no more than the cap get through', async () => {
    await otpChallenge.open(priya, 'SIGN_IN', { via: 'LITE' });
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => otpChallenge.take(priya, 'SIGN_IN', '222222')));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(MAX_ATTEMPTS);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(8 - MAX_ATTEMPTS);
    const stored = await LiteOtpModel.findOne(priya).lean();
    expect(stored?.attempts).toBe(MAX_ATTEMPTS);
  });
});

describe('otpChallenge.consume', () => {
  it('spends a challenge once and refuses a second use', async () => {
    const challenge = await otpChallenge.open(priya, 'SIGN_IN', { via: 'LITE' });
    await otpChallenge.consume(challenge);
    const stored = await LiteOtpModel.findById(challenge._id).lean();
    expect(stored?.consumed_at).toBeInstanceOf(Date);
    await expect(otpChallenge.consume(challenge)).rejects.toMatchObject(badInputError('That code was already used. Ask for a new one'));
  });

  it('lets exactly one of two parallel uses through', async () => {
    const challenge = await otpChallenge.open(priya, 'SIGN_IN', { via: 'LITE' });
    const results = await Promise.allSettled([otpChallenge.consume(challenge), otpChallenge.consume(challenge)]);
    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
  });

  it('takes a used code out of play', async () => {
    const challenge = await otpChallenge.open(priya, 'SIGN_IN', { via: 'LITE' });
    await otpChallenge.consume(challenge);
    await expect(otpChallenge.take(priya, 'SIGN_IN', '123456')).rejects.toMatchObject(badInputError('Ask for a new code first'));
  });
});
