import type { AuthUser } from '@context';
import { userDisplayOf } from '@modules/access/user/user.display';
import type { ActorSnapshot } from './failedPayment.types';

/** Who is acting, frozen for the audit trail: a later rename never rewrites history. */
export async function actorOf(user: AuthUser): Promise<ActorSnapshot> {
  const display = await userDisplayOf(user.id);
  return { id: user.id, name: display.name || user.email || user.id, roles: [...user.roles] };
}
