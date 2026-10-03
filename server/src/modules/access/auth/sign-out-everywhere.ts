import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { sealSessions } from './session-seal';

/**
 * "Sign out of all devices" from the profile page.
 *
 * The same seal a password reset writes (`security.sessions_invalidated_at` +
 * the in-process map in `session-seal`), so there is one mechanism that ends
 * sessions rather than two that could disagree. Duncit tokens never expire, so
 * this is the only way a forgotten browser stops being signed in.
 *
 * The caller's own token is older than the seal too, so it ends with the rest —
 * the client signs out straight after and the next sign-in opens a fresh one.
 */
export async function signOutEverywhere(userId: string): Promise<boolean> {
  const now = new Date();
  const result = await UserModel.updateOne(
    { _id: userId },
    { $set: { 'security.sessions_invalidated_at': now } }
  );
  if (result.matchedCount === 0) {
    throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });
  }
  // This process at once; the boot load and the periodic refresh in
  // `session-seal` carry it to every other replica.
  sealSessions(userId, now);
  logs.server.info('auth', 'sign-out-everywhere', { user_id: userId });
  return true;
}
