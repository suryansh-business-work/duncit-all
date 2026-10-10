import { Schema, model, Types } from 'mongoose';
import { getUrlConfigs } from '@config/url-configs';
import { trimTrailingSlash } from '@utils/url';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { PodMemberModel } from '@modules/pods/podMember/podMember.model';
import { notifyEach } from '@services/notify/notify.service';
import type { PodChallengeDoc } from './podChallenge.model';

/**
 * Tells a pod's attendees about a challenge: that it is LIVE (with the link
 * to follow and take part) and that its RESULT is published.
 *
 * Recipients are the pod's confirmed bookings (PodMember JOINED) at the moment
 * of sending — never a backed-out or refunded booking. Every recipient is
 * claimed in a ledger first, on a unique key, so the automatic send, a host's
 * "Send now" and a retried request can never message the same person twice
 * for the same thing; a "Send now" later reaches only people who joined since.
 *
 * The link is the public viewer link. It carries no authority: the arena
 * decides from the reader's own session what they may see or do, so a
 * forwarded message never hands out host or judge access.
 */

export type ChallengeNoticeKind = 'LIVE' | 'RESULT';

const EVENT: Record<ChallengeNoticeKind, string> = {
  LIVE: 'USER_CHALLENGE_LIVE',
  RESULT: 'USER_CHALLENGE_RESULT',
};

const noticeSchema = new Schema(
  {
    challenge_id: { type: Schema.Types.ObjectId, ref: 'PodChallenge', required: true },
    kind: { type: String, enum: ['LIVE', 'RESULT'], required: true },
    /** The result version a RESULT notice announces (0 for LIVE), so a correction is announced once too. */
    version: { type: Number, default: 0 },
    recipient_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    whatsapp: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    sent_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

noticeSchema.index({ challenge_id: 1, kind: 1, version: 1, recipient_id: 1 }, { unique: true });

export const ChallengeNotificationModel = model('ChallengeNotification', noticeSchema);

export interface NoticeChannels {
  whatsapp: boolean;
  email: boolean;
}

type ChallengeRef = Pick<PodChallengeDoc, '_id' | 'pod_id' | 'name' | 'result_version'>;
type LinkRef = Pick<PodChallengeDoc, '_id' | 'pod_id'>;
type Recipient = Record<string, unknown>;

const versionOf = (challenge: ChallengeRef, kind: ChallengeNoticeKind) => (kind === 'RESULT' ? challenge.result_version : 0);

/** The public viewer link (mirrors @duncit/utils podChallengeLivePath; the server imports no @duncit package). */
export function challengeLiveLink(mwebUrl: string, challenge: LinkRef): string {
  return `${trimTrailingSlash(mwebUrl)}/pod/${challenge.pod_id.toString()}/challenges/${challenge._id.toString()}/live`;
}

function noticeFor(
  challenge: ChallengeRef,
  podTitle: string,
  kind: ChallengeNoticeKind,
  user: Recipient,
  link: string,
  skip: { whatsapp: boolean; email: boolean }
) {
  const name = String((user as { profile?: { first_name?: string } }).profile?.first_name ?? '').trim() || 'there';
  return {
    event: EVENT[kind],
    // One delivery slot per person per notice; a corrected result is a new notice.
    entityId: `${challenge._id.toString()}:${versionOf(challenge, kind)}`,
    user,
    name,
    skip,
    params: kind === 'LIVE' ? [name, podTitle, challenge.name, link] : [name, challenge.name, podTitle, link],
  };
}

/** The fields the two channels read off an account; without them every recipient silently has no address. */
function loadRecipients(ids: (Types.ObjectId | string)[]): Promise<Recipient[]> {
  return UserModel.find({ _id: { $in: ids } })
    .select('profile.first_name auth.email auth.phone communication.whatsapp')
    .lean<Recipient[]>();
}

/** Claims recipients not yet told; returns only the newly claimed ids. */
async function claim(
  challenge: ChallengeRef,
  kind: ChallengeNoticeKind,
  userIds: Types.ObjectId[],
  channels: NoticeChannels,
  actorId: string | null
) {
  if (!userIds.length) return [];
  const version = versionOf(challenge, kind);
  const result = await ChallengeNotificationModel.bulkWrite(
    userIds.map((recipient_id) => ({
      updateOne: {
        filter: { challenge_id: challenge._id, kind, version, recipient_id },
        update: { $setOnInsert: { whatsapp: channels.whatsapp, email: channels.email, sent_by: actorId } },
        upsert: true,
      },
    })) as never[],
    { ordered: false }
  );
  return Object.keys(result.upsertedIds).map((index) => userIds[Number(index)]);
}

export const podChallengeNotify = {
  /**
   * Sends one kind of notice to every confirmed attendee not yet told.
   * @returns how many people were newly messaged.
   */
  async send(
    challenge: ChallengeRef,
    podTitle: string,
    kind: ChallengeNoticeKind,
    channels: NoticeChannels,
    actorId: string | null
  ): Promise<number> {
    if (!channels.whatsapp && !channels.email) return 0;
    const members = await PodMemberModel.find({ pod_id: challenge.pod_id, status: 'JOINED' }).select('user_id').lean();
    const fresh = await claim(challenge, kind, members.map((m) => m.user_id), channels, actorId);
    if (!fresh.length) return 0;

    const [{ mwebUrl }, users] = await Promise.all([getUrlConfigs(), loadRecipients(fresh)]);
    const link = challengeLiveLink(mwebUrl, challenge);
    const skip = { whatsapp: !channels.whatsapp, email: !channels.email };
    await notifyEach(users.map((user) => noticeFor(challenge, podTitle, kind, user, link, skip)));
    return users.length;
  },

  /**
   * "Resend to failed": tries WhatsApp again for everyone already claimed.
   * The WhatsApp log holds one delivery slot per person per notice and frees
   * it only when a send failed, so people who received theirs are skipped by
   * the provider layer and only the failures go out again. Email is not
   * retried here — it has no such slot, and a second copy would be a duplicate.
   * @returns how many people the retry was attempted for.
   */
  async retryWhatsApp(challenge: ChallengeRef, podTitle: string, kind: ChallengeNoticeKind): Promise<number> {
    const claimed = await ChallengeNotificationModel.find({
      challenge_id: challenge._id,
      kind,
      version: versionOf(challenge, kind),
      whatsapp: true,
    })
      .select('recipient_id')
      .lean();
    if (!claimed.length) return 0;
    const [{ mwebUrl }, users] = await Promise.all([getUrlConfigs(), loadRecipients(claimed.map((c) => c.recipient_id))]);
    const link = challengeLiveLink(mwebUrl, challenge);
    await notifyEach(users.map((user) => noticeFor(challenge, podTitle, kind, user, link, { whatsapp: false, email: true })));
    return users.length;
  },

  /** The automatic send after a lifecycle step. Never fails the step that triggered it. */
  async auto(challenge: PodChallengeDoc, podTitle: string, kind: ChallengeNoticeKind, actorId: string) {
    try {
      await podChallengeNotify.send(challenge, podTitle, kind, { whatsapp: challenge.auto_whatsapp, email: challenge.auto_email }, actorId);
    } catch (error) {
      logs.server.error('challenge', 'notify', {
        error,
        msg: 'notification fan-out failed',
        challenge_id: challenge._id.toString(),
        kind,
      });
    }
  },

  /** Who was told what, newest first, for Host Studio's notification history. */
  async history(challengeId: Types.ObjectId) {
    const rows = await ChallengeNotificationModel.aggregate<{
      _id: { kind: string; version: number };
      recipients: number;
      whatsapp: number;
      email: number;
      last_at: Date;
    }>([
      { $match: { challenge_id: challengeId } },
      {
        $group: {
          _id: { kind: '$kind', version: '$version' },
          recipients: { $sum: 1 },
          whatsapp: { $sum: { $cond: ['$whatsapp', 1, 0] } },
          email: { $sum: { $cond: ['$email', 1, 0] } },
          last_at: { $max: '$created_at' },
        },
      },
      { $sort: { last_at: -1 } },
    ]);
    return rows.map((r) => ({
      kind: r._id.kind,
      version: r._id.version,
      recipients: r.recipients,
      whatsapp: r.whatsapp,
      email: r.email,
      last_sent_at: r.last_at.toISOString(),
    }));
  },
};
