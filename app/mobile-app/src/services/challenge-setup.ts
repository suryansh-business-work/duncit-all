import { logs } from '@duncit/logs';
import { mustSetUpChallenge } from '@duncit/utils';

import { PodChallengeSetupDocument } from '@/graphql/challenges';
import { graphqlRequest } from '@/services/graphql.client';

/**
 * Whether a host who has just published this pod should land on its Challenges
 * screen (its category requires one). The RN twin of mWeb's check on the
 * create-pod page (rule 27), deciding with the same shared rule. Never blocks
 * the publish it follows: an unreadable setup means "not required".
 */
export async function challengeRequired(podId: string): Promise<boolean> {
  try {
    const res = await graphqlRequest(PodChallengeSetupDocument, { podId }, { auth: true });
    return mustSetUpChallenge(res.podChallengeSetup);
  } catch (error) {
    logs.mobileApp.warn('create-pod', 'challengeSetup', { error });
    return false;
  }
}
