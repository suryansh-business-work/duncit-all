import { Types } from 'mongoose';
import { PolicyAcceptanceModel } from '@modules/content/policyAcceptance/policyAcceptance.model';
import { UserModel } from '@modules/access/user/user.model';
import { sendPolicyUpdatedEmail } from '@services/email/email.service';
import { getUrlConfigs } from '@config/url-configs';
import { logs } from '@observability/log';
import type { IPolicy } from './policy.model';

/**
 * Telling the people who already agreed that the wording changed.
 *
 * Its own file rather than another method on `policyService`, because the read
 * it needs belongs to the acceptance log and the write it makes belongs to the
 * mail service: folding it into the policy CRUD would make a plain title edit
 * depend on both.
 *
 * Whom it reaches: every distinct account with an acceptance row for this
 * policy, whatever wording they accepted. A person who accepted v1 and v2 is
 * one recipient, and somebody who accepted a version that has since been
 * superseded is exactly who this notice exists for.
 */

/** How many addresses one pass hands the mail service at a time. */
const BATCH = 20;

/** The public page the notice links to — where the new wording actually reads. */
async function policyUrl(slug: string): Promise<string> {
  const { websiteUrl } = await getUrlConfigs();
  const base = websiteUrl.endsWith('/') ? websiteUrl.slice(0, -1) : websiteUrl;
  return `${base}/policy/${slug}`;
}

/** Everyone who has ever accepted this policy, deduplicated by account. */
async function acceptorIds(policyId: string): Promise<string[]> {
  const ids: unknown[] = await PolicyAcceptanceModel.distinct('user_id', {
    policy_id: new Types.ObjectId(policyId),
  });
  return ids.map(String);
}

interface Recipient {
  email: string;
  name: string;
}

/**
 * Addresses for those accounts.
 *
 * A deleted account is skipped: its rows stay in the log forever (that is the
 * record), but sending to a closed mailbox is a bounce, not a notice.
 */
async function recipientsFor(userIds: readonly string[]): Promise<Recipient[]> {
  if (userIds.length === 0) return [];
  const rows: any[] = await UserModel.find({
    _id: { $in: userIds.filter((id) => Types.ObjectId.isValid(id)) },
    'metadata.deleted_at': null,
  })
    .select('auth.email profile.first_name profile.last_name')
    .lean();
  return rows
    .map((row) => ({
      email: String(row.auth?.email ?? '').trim(),
      name: `${row.profile?.first_name ?? ''} ${row.profile?.last_name ?? ''}`.trim(),
    }))
    .filter((recipient) => !!recipient.email);
}

export const policyNotifyService = {
  /**
   * How many accounts a notice would reach right now.
   *
   * Read by the portal so the checkbox can say what pressing it does. Counted
   * from the acceptance log rather than from a stored total, because the answer
   * changes every time somebody accepts.
   */
  async recipientCount(policyId: string): Promise<number> {
    if (!Types.ObjectId.isValid(policyId)) return 0;
    const ids = await acceptorIds(policyId);
    if (ids.length === 0) return 0;
    return (await recipientsFor(ids)).length;
  },

  /**
   * Email everyone who accepted this policy that its wording has changed.
   *
   * Best-effort per address and never throwing: `sendEmail` already records
   * every outcome in the email log, and a mailbox that refuses one notice must
   * not stop the other nine hundred — still less undo the edit that triggered
   * it, which is already saved by the time this runs.
   *
   * Returns how many addresses were handed to the mail service, which is what
   * the portal reports and what the policy stores as `last_notified_count`.
   */
  async notifyAccepted(policy: IPolicy, summary: string): Promise<number> {
    const ids = await acceptorIds(policy._id.toString());
    const recipients = await recipientsFor(ids);
    if (recipients.length === 0) return 0;

    const url = await policyUrl(policy.slug);
    const updatedAt = policy.updated_at?.toISOString() ?? new Date().toISOString();

    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH);
      await Promise.all(
        batch.map((recipient) =>
          sendPolicyUpdatedEmail({
            to: recipient.email,
            name: recipient.name,
            // The policy's own title and Legal's own note: API data, not copy,
            // so both are joined in as they are while every label around them
            // stays a `{{t:}}` key in the template (rule 38).
            policy_title: policy.title,
            // An em dash rather than a hidden row: the template states what it
            // is showing, and a label with nothing under it reads as broken.
            summary: summary || '—',
            policy_url: url,
            updated_at: updatedAt,
          }).catch((error) =>
            logs.server.error('policy.notify', 'notifyAccepted', {
              error,
              msg: 'policy update notice failed',
              policyId: policy._id.toString(),
            })
          )
        )
      );
    }
    return recipients.length;
  },
};
