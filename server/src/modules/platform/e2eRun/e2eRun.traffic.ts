import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { GraphQLError } from 'graphql';
import { e2eOverrides } from './e2eRun.mute';
import { stampTime } from './e2eRun.identity';

/**
 * Which requests belong to a live e2e run.
 *
 * One run makes far more sign-in and one-time-code calls from one runner
 * address than the sign-in rate limit allows a person, so the runner adds
 * `x-duncit-e2e: <stamp>.<key>` to every request the app under test sends. The
 * key is derived from this server's signing secret and the run's stamp, asked
 * for by the runner from the server under test (e2eTrafficKey), never stored.
 *
 * Honoured only while "one-time codes for the run account" is on (the switch
 * that declares a database an e2e target) and only for a stamp from the last
 * few hours, so a key seen in an old log opens nothing.
 */
export const E2E_TRAFFIC_HEADER = 'x-duncit-e2e';

/** Longer than the slowest full run, short enough that an old key is dead. */
const KEY_LIFETIME_MS = 6 * 60 * 60 * 1000;

const sign = (stamp: string): string =>
  createHmac('sha256', process.env.JWT_SECRET || 'dev-secret').update(`e2e-traffic:${stamp}`).digest('hex');

/** The header value a run with this stamp sends, handed out only to an e2e target. */
export async function trafficKeyForRun(stamp: string): Promise<string> {
  const value = String(stamp ?? '').trim();
  if (!stampTime(value)) {
    throw new GraphQLError('stamp must be the run’s ddMMyyyyHHmm identity stamp.', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (!(await e2eOverrides()).otpBypass) {
    throw new GraphQLError(
      'One-time codes for the run account are off in Tech > E2E Tests > Settings on this server.',
      { extensions: { code: 'FORBIDDEN' } }
    );
  }
  return `${value}.${sign(value)}`;
}

function validKey(value: string, now: number): boolean {
  const [stamp, mac] = value.split('.');
  const at = stampTime(stamp ?? '');
  if (!at || !mac) return false;
  const age = now - at.getTime();
  if (age < -KEY_LIFETIME_MS || age > KEY_LIFETIME_MS) return false;
  const expected = Buffer.from(sign(stamp));
  const given = Buffer.from(mac);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function isE2eTraffic(req: Request): Promise<boolean> {
  const raw = req.headers[E2E_TRAFFIC_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !validKey(String(value), Date.now())) return false;
  return (await e2eOverrides()).otpBypass;
}
