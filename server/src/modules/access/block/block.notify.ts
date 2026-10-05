import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { sendEmail } from '@services/email/email.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { UserModel } from '@modules/access/user/user.model';

interface NotifyUser {
  _id: Types.ObjectId;
  profile?: { first_name?: string; last_name?: string; username?: string };
  auth?: { email?: string };
}

/** What the blocker reads the other account as: their name, else their @handle. */
function shownAs(user: NotifyUser | null): string {
  const name = `${user?.profile?.first_name ?? ''} ${user?.profile?.last_name ?? ''}`.trim();
  if (name) return name;
  return user?.profile?.username ? `@${user.profile.username}` : 'this account';
}

/**
 * Confirm a block to the person who made it, by email and WhatsApp.
 *
 * Only ever the BLOCKER: telling the blocked account would hand someone who is
 * being avoided the one fact the blocker wanted to keep from them. `entityId`
 * carries the block time, so a double tap is one WhatsApp but a block made
 * again after an unblock is confirmed again. Never throws — the block is
 * already in force, and both consoles keep a row for anything that did not go.
 */
export async function notifyBlockConfirmed(blockerId: string, blockedId: string, blockedAt: Date) {
  try {
    const [blocker, blocked] = await Promise.all([
      UserModel.findById(blockerId)
        .select('profile.first_name profile.last_name auth.email auth.phone communication.whatsapp')
        .lean<NotifyUser & Record<string, unknown>>(),
      UserModel.findById(blockedId)
        .select('profile.first_name profile.last_name profile.username')
        .lean<NotifyUser>(),
    ]);
    if (!blocker) return;
    const name = blocker.profile?.first_name?.trim() || 'there';
    const account = shownAs(blocked);
    await sendEmail({
      to: blocker.auth?.email?.trim() ?? '',
      subject: `You blocked ${account}`,
      template: 'profile-blocked',
      category: 'legal',
      vars: { name, blocked_name: account },
    });
    await whatsappService.send({
      event: 'USER_PROFILE_BLOCKED',
      entityId: `${blockedId}:${blockedAt.getTime()}`,
      user: blocker,
      name,
      params: [name, account],
    });
  } catch (error) {
    logs.server.error('block.notify', 'notifyBlockConfirmed', { error, blockerId });
  }
}
