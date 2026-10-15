import { logs } from '@observability/log';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { UserModel } from '@modules/access/user/user.model';
import { slackService } from '@modules/platform/slack/slack.service';
import { sendEmail } from '@services/email/email.service';

/**
 * The internal desks that must hear about something the moment it happens.
 *
 * Grievances and content reports carry legal response deadlines, and a refund
 * the gateway refused leaves a customer short of money — yet every one of them
 * was recorded silently, waiting for somebody to open the right console. Each
 * desk is its managers' inboxes plus a Slack channel set under Tech >
 * Environment > Slack (falling back to the default channel).
 *
 * Staff alerts are never WhatsApp: a work alert on a personal phone number is
 * not a channel staff signed up for.
 */
export type StaffDesk = 'FINANCE' | 'LEGAL';

const DESKS: Record<StaffDesk, { role: string; channelKey: string }> = {
  FINANCE: { role: 'FINANCE_MANAGER', channelKey: 'SLACK_FINANCE_CHANNEL' },
  LEGAL: { role: 'LEGAL_MANAGER', channelKey: 'SLACK_LEGAL_CHANNEL' },
};

export interface StaffAlert {
  desk: StaffDesk;
  /** One line: what happened, with its reference. */
  title: string;
  /** The facts a manager needs to act, one per line. */
  lines: readonly string[];
}

async function mailManagers(alert: StaffAlert): Promise<void> {
  const managers = await UserModel.find({
    'metadata.role_keys': DESKS[alert.desk].role,
    'metadata.status': 'ACTIVE',
  })
    .select('auth.email profile.first_name')
    .lean();
  for (const manager of managers) {
    const to = String(manager.auth?.email ?? '');
    if (!to) continue;
    // eslint-disable-next-line no-await-in-loop -- a handful of managers, one send each
    await sendEmail({
      to,
      subject: alert.title,
      template: 'staff-alert',
      category: 'internal',
      vars: {
        name: String(manager.profile?.first_name ?? '') || 'there',
        title: alert.title,
        // One line in the email's details row; Slack below gets one per line.
        details: alert.lines.join(' | '),
      },
    });
  }
}

async function postToDesk(alert: StaffAlert): Promise<void> {
  if (!(await slackService.configured())) return;
  const channel =
    (await getRuntimeEnvValue(DESKS[alert.desk].channelKey)) || (await getRuntimeEnvValue('SLACK_DEFAULT_CHANNEL'));
  if (!channel) return;
  await slackService.send({ channel, text: [`*${alert.title}*`, ...alert.lines].join('\n') });
}

/** Tell a desk. Never throws: whatever triggered it is already saved. */
export async function alertStaff(alert: StaffAlert): Promise<void> {
  const results = await Promise.allSettled([mailManagers(alert), postToDesk(alert)]);
  for (const result of results) {
    if (result.status === 'rejected') {
      logs.server.warn('staff-alert', alert.desk, { error: result.reason, title: alert.title });
    }
  }
}
