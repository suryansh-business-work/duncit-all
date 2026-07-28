import { Text, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import type { PodPendingView } from '@/hooks/usePodPendingView';
import { formatMoney } from '@/utils/checkout-math';
import { podScheduleLabel } from '@/utils/pod-format';
import { pendingPodImage, podPendingStatus } from '@/utils/pod-pending';
import { InfoRow, type InfoRowProps } from './InfoRow';

/** Pod details card on the waiting screen — featured image, title, date & time
 * slot, expected earnings, location, category and current status. */
export function PodPendingSummaryCard({ view }: Readonly<{ view: PodPendingView }>) {
  const { pod } = view;
  const image = pendingPodImage(pod.pod_images_and_videos);
  const location = [pod.place_label, pod.place_detail].filter(Boolean).join(' · ');
  // TODO(i18n) — row labels ship as literals until this feature is localized.
  const rows: InfoRowProps[] = [
    {
      icon: 'event',
      label: 'Date & time',
      value: podScheduleLabel(pod.pod_date_time, pod.pod_end_date_time),
      testID: 'pod-pending-when',
    },
    {
      icon: 'payments',
      label: 'Expected earnings',
      value: formatMoney(view.currency_symbol, view.expected_earnings),
      testID: 'pod-pending-earnings',
    },
  ];
  if (location) {
    rows.push({
      icon: 'place',
      label: 'Location',
      value: location,
      testID: 'pod-pending-location',
    });
  }
  if (view.category_name) {
    rows.push({
      icon: 'category',
      label: 'Category',
      value: view.category_name,
      testID: 'pod-pending-category',
    });
  }
  rows.push({
    icon: 'info',
    label: 'Current status',
    value: podPendingStatus(pod.venue_approval_status),
    testID: 'pod-pending-status',
  });

  return (
    <YStack
      testID="pod-pending-summary"
      gap={10}
      padding={12}
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={12}
      backgroundColor="$surface"
    >
      {image ? (
        <AppImage
          testID="pod-pending-image"
          source={{ uri: image }}
          style={{ width: '100%', height: 160, borderRadius: 10 }}
        />
      ) : null}
      <Text fontSize={16} fontWeight="900" color="$color">
        {pod.pod_title}
      </Text>
      {rows.map((row) => (
        <InfoRow key={row.label} {...row} />
      ))}
    </YStack>
  );
}
