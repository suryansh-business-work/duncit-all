import { useApolloClient, useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { logs } from '@duncit/logs';
import { hostPodChallengesPath, mustSetUpChallenge } from '@duncit/utils';
import { POD_CHALLENGE_SETUP } from '../host-pod-challenges-page/queries';
import { useTranslation } from '../../i18n/useTranslation';
import { PUBLISH_POD_DRAFT } from './queries';

interface PublishData {
  publishPodDraft: { id: string; venue_approval_status: string };
}

/** Publishes the stepper's draft and lands the host where that pod now needs them. */
export function useCreatePodPublish() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const { t } = useTranslation();
  const [publishMut] = useMutation<PublishData>(PUBLISH_POD_DRAFT);

  /** Never blocks the publish it follows: an unreadable setup means "not required". */
  const challengeRequired = async (podId: string) => {
    try {
      const res = await client.query({ query: POD_CHALLENGE_SETUP, variables: { podId }, fetchPolicy: 'network-only' });
      return mustSetUpChallenge(res.data?.podChallengeSetup);
    } catch (error) {
      logs.mWeb.warn('create-pod', 'challengeSetup', { error });
      return false;
    }
  };
  return async (id: string, input: unknown) => {
    const res = await publishMut({ variables: { draft_id: id, input } });
    const created = res.data?.publishPodDraft;
    if (!created) throw new Error(t('mweb.createPod.createFailed'));
    // Venue bookings are instant now, so a new pod comes back APPROVED and lands
    // where a live pod lands. PENDING is kept only for older pods still waiting
    // on a venue (native twin, rule 27).
    if (created.venue_approval_status === 'PENDING') {
      navigate(`/host/pod-pending/${created.id}`);
    } else if (await challengeRequired(created.id)) {
      // The pod's category requires a challenge: take the host to set it up.
      navigate(hostPodChallengesPath(created.id));
    } else {
      navigate('/host/manage');
    }
  };
}
