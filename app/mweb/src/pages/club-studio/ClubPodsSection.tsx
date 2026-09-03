import { useQuery } from '@apollo/client/react';
import { changeRequestMenuKey } from '@duncit/utils';
import { useRequestPodChange } from '@duncit/pod-change-requests';
import { notifySuccess } from '../../components/notify';
import {
  CLUB_STUDIO_PODS,
  EMPTY_STUDIO_SUMMARY,
  StudioPodsSection,
  type StudioPod,
} from '../../components/studio-pods';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * "Your Pods" — every pod across the clubs the signed-in user administers.
 *
 * The roll-up comes from the server (`myClubPodsSummary`) rather than from the
 * list: it is computed over EVERY pod in scope while the list is capped, and
 * collected revenue is not derivable from a pod row at all.
 */
export default function ClubPodsSection() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<any>(CLUB_STUDIO_PODS, {
    fetchPolicy: 'cache-and-network',
  });

  const pods: StudioPod[] = data?.studioPods ?? [];
  const summary = data?.studioSummary ?? EMPTY_STUDIO_SUMMARY;

  // "Request Change Club Admin" — a club admin asking Duncit to hand this
  // pod's club to somebody else. The club, not the pod, carries that
  // assignment, so the ask is club-wide and the copy says so.
  const change = useRequestPodChange({ onFiled: notifySuccess });

  return (
    <>
    <StudioPodsSection
      title={t('mweb.studioPods.clubTitle')}
      subtitle={t('mweb.studioPods.clubSubtitle')}
      scopeLabel={t('mweb.studioPods.clubs')}
      emptyText={t('mweb.studioPods.clubEmpty')}
      pods={pods}
      summary={summary}
      loading={loading && !data}
      failed={!!error && !data}
      onRetry={() => {
        refetch().catch(() => undefined);
      }}
      onRequestChange={(pod) =>
        change.open({ podDocId: pod.id, role: 'CLUB_ADMIN', attendeeCount: pod.attendee_count })
      }
      requestChangeLabel={t(changeRequestMenuKey('CLUB_ADMIN'))}
    />
    {change.dialog}
    </>
  );
}
