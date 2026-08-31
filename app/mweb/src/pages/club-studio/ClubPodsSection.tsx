import { useQuery } from '@apollo/client/react';
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

  return (
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
    />
  );
}
