import { Text } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { PodPendingView } from '@/hooks/usePodPendingView';
import { useTranslation } from '@/hooks/useTranslation';
import { formatMoney } from '@/utils/checkout-math';
import { podScheduleLabel } from '@/utils/pod-format';
import { pendingPodImage, podPendingStatus } from '@/utils/pod-pending';
import { InfoRowList, type InfoRowProps } from './InfoRow';

const COVER_STYLE = { width: '100%', height: 160, borderRadius: 18 } as const;

/** Pod details card on the waiting screen — featured image, title, date & time
 * slot, expected earnings, location, category and current status. */
export function PodPendingSummaryCard({ view }: Readonly<{ view: PodPendingView }>) {
  const { t } = useTranslation();
  const { pod } = view;
  const image = pendingPodImage(pod.pod_images_and_videos);
  const location = [pod.place_label, pod.place_detail].filter(Boolean).join(' · ');
  const rows: InfoRowProps[] = [
    {
      icon: 'event',
      label: t('mweb.podPending.dateTime'),
      value: podScheduleLabel(pod.pod_date_time, pod.pod_end_date_time),
      testID: 'pod-pending-when',
    },
    {
      icon: 'payments',
      label: t('mweb.podPending.expectedEarnings'),
      value: formatMoney(view.currency_symbol, view.expected_earnings),
      testID: 'pod-pending-earnings',
    },
  ];
  if (location) {
    rows.push({
      icon: 'place',
      label: t('mweb.podPending.location'),
      value: location,
      testID: 'pod-pending-location',
    });
  }
  if (view.category_name) {
    rows.push({
      icon: 'category',
      label: t('mweb.podPending.category'),
      value: view.category_name,
      testID: 'pod-pending-category',
    });
  }
  rows.push({
    icon: 'info',
    label: t('mweb.podPending.currentStatus'),
    value: podPendingStatus(pod.venue_approval_status, t),
    testID: 'pod-pending-status',
  });

  return (
    <SurfaceCard testID="pod-pending-summary" gap={12}>
      {image ? (
        <AppImage testID="pod-pending-image" source={{ uri: image }} style={COVER_STYLE} />
      ) : null}
      <Text fontSize={16} fontWeight="600" color="$color">
        {pod.pod_title}
      </Text>
      <InfoRowList rows={rows} />
    </SurfaceCard>
  );
}
