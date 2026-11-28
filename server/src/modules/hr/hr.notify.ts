import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { consoleUrl } from '@modules/platform/portalMode/portalMode.links';
import { sendEmail } from '@services/email/email.service';
import { loadNotifyRecipients, recipientName } from '@services/notify/notify.recipients';

/**
 * How the HR modules tell people things: an in-app notice, and for the events
 * that need an inbox, an email from a template the Communications portal owns.
 * Staff are never messaged on WhatsApp. Nothing here throws — a notice that
 * fails must never undo a decision that is already saved.
 */

/** Active accounts holding any of `roles`; Super Admins only when nobody holds them. */
export async function roleHolderIds(roles: readonly string[]): Promise<string[]> {
  const find = (keys: readonly string[]) =>
    UserModel.find({ 'metadata.role_keys': { $in: [...keys] }, 'metadata.status': 'ACTIVE' })
      .select('_id')
      .limit(50)
      .lean<{ _id: Types.ObjectId }[]>();
  let users = await find(roles);
  if (users.length === 0) users = await find(['SUPER_ADMIN']);
  return users.map((user) => String(user._id));
}

export type HrConsole = 'employee' | 'hr' | 'finance';

/** A page on a console, on this environment's host. */
export const hrLink = (console: HrConsole, path: string): string => consoleUrl(console, path) ?? path;

export interface HrNotice {
  userIds: readonly string[];
  title: string;
  body: string;
  link: string;
  /** The template to email as well, and its variables. `name` is filled per recipient. */
  email?: { template: string; subject: string; vars: Record<string, string> };
}

export async function notifyHr(notice: HrNotice, source: string): Promise<void> {
  const ids = [...new Set(notice.userIds.filter((id) => Types.ObjectId.isValid(id)))];
  if (ids.length === 0) return;
  try {
    await notificationService.create({
      scope: 'USER',
      target_user_ids: ids,
      title: notice.title,
      body: notice.body,
      link_url: notice.link,
      silent: false,
    });
  } catch (error) {
    logs.server.warn(source, 'in-app', { error, recipients: ids.length });
  }
  const email = notice.email;
  if (!email) return;
  try {
    const users = await loadNotifyRecipients(ids);
    await Promise.all(
      [...users.values()].map((user) => {
        const to = user.auth?.email;
        if (!to) return null;
        return sendEmail({ to, subject: email.subject, template: email.template, category: 'internal', vars: { ...email.vars, name: recipientName(user) } });
      })
    );
  } catch (error) {
    logs.server.warn(source, 'email', { error, template: email.template, recipients: ids.length });
  }
}
