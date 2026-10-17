import { useApolloClient, useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { logs } from '@duncit/logs';
import { hostPodChallengesPath, mustSetUpChallenge, type PodSeriesPlan } from '@duncit/utils';
import { notifySuccess } from '../../components/notify';
import { POD_CHALLENGE_SETUP } from '../host-pod-challenges-page/queries';
import { useTranslation } from '../../i18n/useTranslation';
import { PUBLISH_POD_DRAFT, PUBLISH_POD_DRAFT_SERIES } from './queries';

interface PublishData {
  publishPodDraft: { id: string; venue_approval_status: string };
}

interface SeriesPublishData {
  publishPodDraftSeries: { created_count: number; skipped: { date: string }[] };
}

/** Publishes the stepper's draft — one pod, or one per date of a recurring pod —
 * and lands the host where that pod now needs them. */
export function useCreatePodPublish() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const { t } = useTranslation();
  const [publishMut] = useMutation<PublishData>(PUBLISH_POD_DRAFT);
  const [publishSeriesMut] = useMutation<SeriesPublishData>(PUBLISH_POD_DRAFT_SERIES);

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
  /** A recurring pod: every date that could run is now a pod, each waiting on
   * its venue (or live, at the host's own venue). Say how many, and which
   * dates were skipped, then land on Host Management where they are listed. */
  const publishSeries = async (id: string, input: unknown, plan: PodSeriesPlan) => {
    const res = await publishSeriesMut({ variables: { draft_id: id, input, plan } });
    const result = res.data?.publishPodDraftSeries;
    const created = result?.created_count ?? 0;
    const skipped = result?.skipped.length ?? 0;
    notifySuccess(
      skipped
        ? t('mweb.podSeries.publishedSkipped', { vars: { created, skipped } })
        : t('mweb.podSeries.published', { vars: { created } })
    );
    navigate('/host/manage');
  };
  return async (id: string, input: unknown, plan: PodSeriesPlan | null) => {
    if (plan) return publishSeries(id, input, plan);
    const res = await publishMut({ variables: { draft_id: id, input } });
    const created = res.data?.publishPodDraft;
    if (!created) throw new Error(t('mweb.createPod.createFailed'));
    // A pod holding a venue slot awaits the venue's decision — land the host on
    // the waiting page instead of Host Management (native twin, rule 27).
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
