/**
 * The retention limit on the invite list (GDPR storage limitation).
 *
 * A `ContactInvite` is a phone number of somebody who is NOT a Duncit member
 * and never agreed to anything. It is kept only while it is useful to the
 * member whose phone book it came from: every sync refreshes the rows it still
 * sees, so a row nobody has synced for 90 days belongs to a member who stopped
 * using the feature, and is deleted. A later sync simply lists it again.
 *
 * No-ops under NODE_ENV=test.
 */
import { logs } from '@observability/log';
import { startClusterJob } from '@utils/clusterJob';
import { ContactInviteModel } from './contacts.model';

export const CONTACT_INVITE_RETENTION_DAYS = 90;

const DAY_MS = 24 * 60 * 60_000;
/** Let the server finish booting before the first sweep. */
const FIRST_DELAY_MS = 20 * 60_000;

export async function purgeStaleContactInvites(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - CONTACT_INVITE_RETENTION_DAYS * DAY_MS);
  const { deletedCount } = await ContactInviteModel.deleteMany({ updated_at: { $lt: cutoff } });
  return deletedCount;
}

async function sweep(): Promise<void> {
  const removed = await purgeStaleContactInvites();
  if (removed > 0) {
    logs.server.info('contacts', 'retentionSweep', {
      removed,
      msg: `Deleted ${removed} contact invites nobody has synced for ${CONTACT_INVITE_RETENTION_DAYS} days`,
    });
  }
}

export function startContactInviteRetentionScheduler(): () => void {
  return startClusterJob({
    component: 'contacts',
    operation: 'retentionSweep',
    firstDelayMs: FIRST_DELAY_MS,
    intervalMs: DAY_MS,
    run: sweep,
  });
}
