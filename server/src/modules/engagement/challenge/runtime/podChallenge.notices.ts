import { GraphQLError } from 'graphql';
import type { AuthUser } from '@context';
import { managed } from './podChallenge.scoring';
import { podChallengeNotify, type ChallengeNoticeKind } from './podChallenge.notify';

/**
 * Host Studio's notification controls: Send now, Resend to failed, and the
 * history. A notice only goes out when it is true — the live link while the
 * challenge is in play, the result link once a result is published.
 */

const KINDS: readonly ChallengeNoticeKind[] = ['LIVE', 'RESULT'];

function bad(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

export const podChallengeNotices = {
  async send(challengeId: string, kind: string, retryFailed: boolean, user: AuthUser): Promise<number> {
    if (!KINDS.includes(kind as ChallengeNoticeKind)) bad('Unknown notification');
    const notice = kind as ChallengeNoticeKind;
    const { doc, pod } = await managed(challengeId, user);
    if (notice === 'LIVE' && doc.status !== 'LIVE' && doc.status !== 'PAUSED') {
      bad('The live link can only be sent while the challenge is running');
    }
    if (notice === 'RESULT' && doc.result_version < 1) bad('Publish the result before sharing it');
    if (retryFailed) return podChallengeNotify.retryWhatsApp(doc, pod.pod_title, notice);
    // A manual send is the host asking for it now, so it uses both channels
    // whatever the automatic switches say; each person's own preferences still apply.
    return podChallengeNotify.send(doc, pod.pod_title, notice, { whatsapp: true, email: true }, user.id);
  },

  async history(challengeId: string, user: AuthUser) {
    const { doc } = await managed(challengeId, user);
    return podChallengeNotify.history(doc._id);
  },
};
