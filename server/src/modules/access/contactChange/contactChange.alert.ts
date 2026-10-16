import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { sendEmail } from '@services/email/email.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';
import { appDateTime } from '@utils/app-time';
import { trimTrailingSlash } from '@utils/url';
import type { NotifyUser } from '@services/notify/notify.recipients';

/** Which contact detail moved. */
export type ChangedContact = 'EMAIL' | 'PHONE' | 'WHATSAPP';

/** How the message names it — server message copy is plain English, like every
 * other WhatsApp value this server fills. */
const LABEL: Record<ChangedContact, string> = {
  EMAIL: 'email address',
  PHONE: 'phone number',
  WHATSAPP: 'WhatsApp number',
};

type ContactUser = NotifyUser | null | undefined;

/** A stored number as AiSensy dials it: country code first, digits only. */
function dialable(source?: { extension?: string | null; number?: string | null } | null): string {
  const number = String(source?.number ?? '').replaceAll(/\D/g, '');
  if (!number) return '';
  const extension = String(source?.extension ?? '').replaceAll(/\D/g, '');
  return number.length > 10 || !extension ? number : `${extension}${number}`;
}

/** The number this person was reached on BEFORE the change. */
function previousNumber(before: ContactUser, what: ChangedContact): string {
  if (what === 'PHONE') return dialable(before?.auth?.phone);
  if (what === 'WHATSAPP') return dialable(before?.communication?.whatsapp);
  return '';
}

/**
 * Tell the person — on the contact that is being REPLACED — that a contact
 * detail on their account changed.
 *
 * The codes that prove a change go to the NEW value, which is right for proving
 * it and useless for catching a takeover: somebody who has got into an account
 * proves their own address and the owner never hears. This is the message that
 * reaches the owner.
 *
 *   - email changed: the OLD address is emailed, and the account's WhatsApp
 *     (which did not move) is messaged too.
 *   - a number changed: the OLD number is messaged, and the account's email
 *     (which did not move) is told as well.
 *
 * Never throws: the change is already saved and audited.
 */
export async function alertContactChanged(before: ContactUser, after: ContactUser, what: ChangedContact) {
  try {
    const name = String(before?.profile?.first_name ?? '').trim() || 'there';
    const label = LABEL[what];
    // The public contact page, not the in-app one: somebody whose account was
    // just taken over may no longer be able to sign in to reach support.
    const { websiteUrl } = await getUrlConfigs();
    const supportUrl = `${trimTrailingSlash(websiteUrl)}/contact`;
    const changedAt = new Date();
    const entityId = `${String(before?._id ?? '')}:${what}:${changedAt.getTime()}`;

    const to = String((what === 'EMAIL' ? before?.auth?.email : after?.auth?.email) ?? '').trim();
    const previous = previousNumber(before, what);
    await Promise.all([
      to
        ? sendEmail({
            to,
            subject: `Your Duncit ${label} was changed`,
            template: 'contact-changed-alert',
            category: 'transactional',
            vars: { name, what: label, when: appDateTime(changedAt), support_url: supportUrl },
          })
        : null,
      // A number set for the first time has no old number to warn; messaging
      // the account would only reach the new one, which proves nothing.
      what !== 'EMAIL' && !previous
        ? null
        : whatsappService.send({
            event: 'USER_CONTACT_CHANGED',
            entityId,
            // An old number is addressed directly — the account now points at
            // the new one. An email change uses the account's own WhatsApp.
            ...(previous ? { destination: previous } : { user: after }),
            name,
            params: [name, label, supportUrl],
          }),
    ]);
  } catch (error) {
    logs.server.error('contactChange', 'alertContactChanged', { error, what });
  }
}
