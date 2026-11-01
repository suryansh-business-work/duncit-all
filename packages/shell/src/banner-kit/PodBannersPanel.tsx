import { useQuery } from '@apollo/client/react';
import { Divider, Stack } from '@mui/material';
import { EmptyState, QueryGuard, SectionCard } from '@duncit/ui';
import { useTranslation } from '../i18n/useTranslation';
import { PodBannerRow, type BannerPod } from './PodBannerRow';
import { BANNER_PODS } from './queries';

/** How many of the partner's next pods are offered at once. */
const PAGE_SIZE = 25;

export interface PodBannersPanelProps {
  /**
   * The `podsTable` filter that names the partner's pods: a venue's
   * (`venue_id`) or a host's (`host_user_id`, their account id).
   */
  filter: { field: 'venue_id' | 'host_user_id'; value: string };
}

/**
 * Banners — a partner's upcoming pods, soonest first, each with Make banners:
 * the carousel slides are rendered from the pod and the venue's and host's
 * banner kits, and come back as links to download. The same panel in the
 * Partners console and in the Venues, Hosts and Onboarding consoles.
 */
export function PodBannersPanel({ filter }: Readonly<PodBannersPanelProps>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ podsTable: { rows: BannerPod[] } }>(BANNER_PODS, {
    variables: {
      query: {
        page: 1,
        page_size: PAGE_SIZE,
        sort_by: 'pod_date_time',
        sort_dir: 'asc',
        filters: [{ field: filter.field, op: 'eq', value: filter.value }],
      },
    },
    fetchPolicy: 'cache-and-network',
    skip: !filter.value,
  });
  const pods = data?.podsTable.rows ?? [];

  return (
    <SectionCard title={t('shell.podBanners.title')} subtitle={t('shell.podBanners.subtitle')}>
      <QueryGuard loading={loading && !data} error={error} errorText={error?.message}>
        {pods.length === 0 ? (
          <EmptyState compact title={t('shell.podBanners.empty')} data-testid="pod-banners-empty" />
        ) : (
          <Stack spacing={2} divider={<Divider flexItem />}>
            {pods.map((pod) => (
              <PodBannerRow key={pod.id} pod={pod} />
            ))}
          </Stack>
        )}
      </QueryGuard>
    </SectionCard>
  );
}
