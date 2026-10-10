import { GraphQLError } from 'graphql';
import type { AuthUser } from '@context';
import { withTransaction } from '@utils/mongoTransaction';
import { ChallengeAuditLogModel, ChallengeResultModel } from './challengeLedger.model';
import { PodChallengeModel, type PodChallengeDoc } from './podChallenge.model';
import { conflict } from './podChallenge.commit';
import { emitChallengeChanged } from './challenge.socket';
import { managed } from './podChallenge.scoring';
import { liveStandings, toView } from './podChallenge.view';
import { winnersOf } from './challenge.standings';
import { podChallengeNotify } from './podChallenge.notify';

/**
 * Finalize & Publish. A published result is an immutable snapshot (standings,
 * winners, the tool configs it was ranked with). Publishing again is a
 * CORRECTION: Challenge staff only, with a reason, producing version N+1 and
 * retiring version N — every version stays on file for the audit trail.
 *
 * The version bump is a compare-and-set on `result_version`, so two publishes
 * racing each other produce one result, not two.
 */

function bad(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

export const podChallengeResults = {
  async publish(challengeId: string, reason: string | null | undefined, user: AuthUser) {
    const { doc, pod, access } = await managed(challengeId, user);
    if (doc.status !== 'COMPLETED') bad('End the challenge before publishing its result');
    const isCorrection = doc.result_version > 0;
    if (isCorrection && !access.isStaff) {
      throw new GraphQLError('Published results can only be corrected by Challenge staff', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    if (isCorrection && !reason?.trim()) bad('A corrected result needs a reason');
    const standings = await liveStandings(doc);
    if (!standings.length) bad('There is nobody to rank yet');

    const version = doc.result_version + 1;
    const next = await withTransaction(async (session) => {
      const updated = await PodChallengeModel.findOneAndUpdate(
        { _id: doc._id, status: 'COMPLETED', result_version: doc.result_version },
        { $set: { result_version: version }, $inc: { revision: 1 } },
        { new: true, session }
      ).lean<PodChallengeDoc>();
      if (!updated) conflict();
      await ChallengeResultModel.updateMany(
        { challenge_id: doc._id, is_current: true },
        { $set: { is_current: false } },
        { session }
      );
      await ChallengeResultModel.create(
        [
          {
            challenge_id: doc._id,
            pod_id: doc.pod_id,
            version,
            is_current: true,
            standings,
            winner_ids: winnersOf(standings),
            tools: doc.tools,
            published_by: user.id,
            published_at: new Date(),
            reason: reason?.trim() ?? '',
          },
        ],
        { session }
      );
      await ChallengeAuditLogModel.create(
        [
          {
            challenge_id: doc._id,
            pod_id: doc.pod_id,
            actor_id: user.id,
            action: isCorrection ? 'RESULT_CORRECTED' : 'RESULT_PUBLISHED',
            new_value: { version, winner_ids: winnersOf(standings) },
            reason: reason?.trim() ?? '',
          },
        ],
        { session }
      );
      return updated;
    });
    emitChallengeChanged(next._id.toString(), next.revision, 'RESULT');
    // Attendees hear about the result only after it is committed and locked.
    await podChallengeNotify.auto(next, pod.pod_title, 'RESULT', user.id);
    return toView(next, pod, access, user.id);
  },
};
