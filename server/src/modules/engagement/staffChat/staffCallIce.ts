/**
 * Where a staff call looks for a route to the other browser.
 *
 * Public STUN is enough only when at least one side can be reached directly.
 * Two people on separate office or home networks usually cannot be — which is
 * why a call that works perfectly between two tabs on one machine fails
 * between two colleagues, and why that failure only ever shows up in
 * production. A TURN relay carries the media in that case.
 *
 * The relay's credentials are managed in the Tech portal like every other
 * service credential here, and served to the browser at call time — never
 * baked into a build, because seventeen consoles each carrying a copy of a
 * secret is seventeen ways to lose it.
 */
import { getRuntimeEnvValue } from '@config/runtimeEnv';

export interface StaffIceServer {
  urls: string[];
  username: string;
  credential: string;
}

const PUBLIC_STUN = ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'];

const list = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

export async function staffCallIceServers(): Promise<StaffIceServer[]> {
  const stun: StaffIceServer = { urls: PUBLIC_STUN, username: '', credential: '' };
  const turnUrls = list(await getRuntimeEnvValue('TURN_URLS'));
  // No relay configured: STUN alone, which still connects anyone who can be
  // reached directly. Saying so here beats a call that fails without a reason.
  if (turnUrls.length === 0) return [stun];
  return [
    stun,
    {
      urls: turnUrls,
      username: await getRuntimeEnvValue('TURN_USERNAME'),
      credential: await getRuntimeEnvValue('TURN_CREDENTIAL'),
    },
  ];
}
