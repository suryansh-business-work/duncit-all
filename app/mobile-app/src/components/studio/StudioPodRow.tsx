import { formatMoney } from '@duncit/utils';
import { Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { bucketLabelKey, bucketTone, type StudioPod } from './studio-pods';

interface RowMetricProps {
  label: string;
  value: string;
  testID: string;
}

/** One labelled number on a pod row (spots, people, ticket price). */
function RowMetric({ label, value, testID }: Readonly<RowMetricProps>) {
  return (
    <YStack testID={testID} flexBasis="30%" flexGrow={1} gap={1}>
      <Text fontSize={10.5} fontWeight="700" color="$muted" numberOfLines={1}>
        {label}
      </Text>
      <Text fontSize={13.5} fontWeight="600" color="$color" numberOfLines={1}>
        {value}
      </Text>
    </YStack>
  );
}

interface StudioPodRowProps {
  pod: StudioPod;
  /** Start of the pod, already formatted in the admin's date/time settings —
   * the section formats every row with one formatter (rule 11). */
  when: string;
  /** Server-provided currency symbol; null uses the formatter's default. */
  currencySymbol: string | null;
  testID: string;
}

/**
 * One pod in a studio list — the same row for a pod at your venue and a pod in
 * your club, because VenuePod and ClubPod carry the same fields.
 */
export function StudioPodRow({ pod, when, currencySymbol, testID }: Readonly<StudioPodRowProps>) {
  const { t } = useTranslation();

  const hosts = pod.host_names.filter(Boolean).join(', ');
  const price =
    pod.pod_type === 'FREE'
      ? t('mweb.podDetails.free')
      : formatMoney(pod.pod_amount, { symbol: currencySymbol ?? undefined });

  return (
    <YStack
      testID={testID}
      gap={8}
      padding={12}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack alignItems="center" gap={8}>
        <Text flex={1} fontSize={14.5} fontWeight="600" color="$color" numberOfLines={1}>
          {pod.pod_title}
        </Text>
        <XStack
          testID={`${testID}-state`}
          paddingHorizontal={8}
          paddingVertical={3}
          borderRadius={999}
          borderWidth={1}
          borderColor={bucketTone(pod.bucket)}
        >
          <Text fontSize={10.5} fontWeight="700" color={bucketTone(pod.bucket)}>
            {t(bucketLabelKey(pod.bucket))}
          </Text>
        </XStack>
      </XStack>

      <Text fontSize={12} color="$muted" numberOfLines={1}>
        {pod.owner_name ? `${when} · ${pod.owner_name}` : when}
      </Text>

      <Text fontSize={12} color="$muted" numberOfLines={1}>
        {t('mweb.studioPods.hosts')}: {hosts || t('mweb.studioPods.hostsNone')}
      </Text>

      <XStack gap={10}>
        <RowMetric
          testID={`${testID}-spots`}
          label={t('mweb.studioPods.spots')}
          value={`${pod.attendee_count} / ${pod.no_of_spots}`}
        />
        <RowMetric
          testID={`${testID}-people`}
          label={t('mweb.studioPods.people')}
          value={String(pod.pod_attendees.length)}
        />
        <RowMetric testID={`${testID}-price`} label={t('mweb.studioPods.ticket')} value={price} />
      </XStack>
    </YStack>
  );
}
