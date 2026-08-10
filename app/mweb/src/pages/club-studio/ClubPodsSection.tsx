import { useQuery } from '@apollo/client';
import {
  CLUB_STUDIO_PODS,
  StudioPodsSection,
  type StudioPod,
  type StudioPodSummary,
} from '../../components/studio-pods';
import { usePricing } from '../../hooks/usePricing';
import { useTranslation } from '../../i18n/useTranslation';

/** `myClubPodsSummary` as the shared strip reads it. `clubs` is the scope count
 * and `total_revenue` is the one figure a pod row cannot yield. */
interface ClubPodSummaryResult {
  clubs: number;
  total: number;
  upcoming: number;
  ongoing: number;
  completed: number;
  cancelled: number;
  total_spots: number;
  filled_spots: number;
  total_attendees: number;
  fill_rate: number;
  next_pod_date_time: string | null;
  total_revenue: number;
  currency_symbol: string;
}

function toStudioSummary(
  result: ClubPodSummaryResult | undefined,
  currencySymbol: string,
): StudioPodSummary {
  if (!result) {
    return {
      scope_count: 0,
      total: 0,
      upcoming: 0,
      ongoing: 0,
      completed: 0,
      cancelled: 0,
      total_spots: 0,
      filled_spots: 0,
      total_attendees: 0,
      fill_rate: 0,
      next_pod_date_time: null,
      total_revenue: 0,
      currency_symbol: currencySymbol,
    };
  }
  const { clubs, ...rest } = result;
  return { ...rest, scope_count: clubs };
}

/**
 * "Your Pods" — every pod across the clubs the signed-in user administers.
 *
 * The roll-up comes from the server (`myClubPodsSummary`) rather than from the
 * list: it is computed over EVERY pod in scope while the list is capped, and
 * collected revenue is not derivable from a pod row at all.
 */
export default function ClubPodsSection() {
  const { t } = useTranslation();
  const { currency } = usePricing();
  const { data, loading, error, refetch } = useQuery(CLUB_STUDIO_PODS, {
    fetchPolicy: 'cache-and-network',
  });

  const pods: StudioPod[] = data?.studioPods ?? [];
  const summary = toStudioSummary(data?.studioSummary, currency);

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
