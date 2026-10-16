import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { sendEmail } from '@services/email/email.service';
import { appDate } from '@utils/app-time';
import { trimTrailingSlash } from '@utils/url';

/**
 * The three emails a deletion request produces: filed, turned down, carried out.
 *
 * Filing a request signs the member out everywhere and closes the account, so
 * from that moment email is the ONLY thing that still reaches them — and every
 * one of these used to be silent. Each goes to the address snapshotted on the
 * request, because by the last one the account it came from no longer exists.
 *
 * Email only, deliberately: a deletion is the moment somebody has asked us to
 * stop; a WhatsApp about it is the message they least want. `transactional`,
 * so a marketing opt-out cannot eat the record of their own request.
 *
 * Never throws: the request is already saved, and a mailbox outage must not
 * undo or block it.
 */

interface DeletionNoticeSubject {
  request_id: string;
  snapshot_name?: string | null;
  snapshot_email?: string | null;
  scheduled_delete_at?: Date | null;
  note?: string | null;
}

const firstName = (doc: DeletionNoticeSubject) =>
  String(doc.snapshot_name ?? '').trim().split(/\s+/)[0] || 'there';

/** The public contact page — a sealed account cannot sign in to reach support. */
async function contactUrl(): Promise<string> {
  const { websiteUrl } = await getUrlConfigs();
  return `${trimTrailingSlash(websiteUrl)}/contact`;
}

async function send(doc: DeletionNoticeSubject, template: string, subject: string, extra: Record<string, string>) {
  const to = String(doc.snapshot_email ?? '').trim();
  if (!to) return;
  try {
    await sendEmail({
      to,
      subject,
      template,
      category: 'transactional',
      vars: {
        name: firstName(doc),
        request_id: doc.request_id,
        contact_url: await contactUrl(),
        ...extra,
      },
    });
  } catch (error) {
    logs.server.warn('account-deletion', 'notify', { error, template, request_id: doc.request_id });
  }
}

/** Filed: what happens next, and the date it becomes permanent. */
export const notifyDeletionRequested = (doc: DeletionNoticeSubject) =>
  send(doc, 'account-deletion-requested', 'Your Duncit account deletion request', {
    delete_on: appDate(doc.scheduled_delete_at),
  });

/** Turned down by the team — the account is open again, and why. */
export const notifyDeletionRejected = (doc: DeletionNoticeSubject) =>
  send(doc, 'account-deletion-rejected', 'Your Duncit account is open again', {
    note: String(doc.note ?? '').trim() || '-',
  });

/** Carried out: the last message this address will get about the account. */
export const notifyDeletionCompleted = (doc: DeletionNoticeSubject) =>
  send(doc, 'account-deletion-completed', 'Your Duncit account has been deleted', {});
