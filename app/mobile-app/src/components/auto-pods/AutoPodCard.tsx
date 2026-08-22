import { useState, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Separator, Text, XStack, YStack } from 'tamagui';
import { autoPodWaitingOn, type AutoPodLabels, type AutoPodRow } from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import { AutoPodTicksRow } from '@/components/auto-pods/AutoPodTicksRow';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  row: AutoPodRow;
  labels: AutoPodLabels;
  /** Formats the slot window in the viewer's configured date/time settings. */
  formatWhen: (iso: string) => string;
  /** Formats money in the viewer's currency. */
  formatMoney: (amount: number) => string;
  /** The role's primary button — the caller owns the action. */
  action?: ReactNode;
}

const firstImage = (row: AutoPodRow): string | null =>
  row.pod_images_and_videos.find((media) => (media.type ?? 'IMAGE') === 'IMAGE')?.url ?? null;

/** One labelled detail line with its icon, e.g. the venue and the slot date. */
function DetailLine({
  icon,
  value,
  tint,
}: Readonly<{ icon: 'place' | 'event'; value: string; tint: string }>) {
  return (
    <XStack alignItems="center" gap={6}>
      <MaterialIcons name={icon} size={14} color={tint} />
      <Text flex={1} fontSize={12.5} color="$color" numberOfLines={1}>
        {value}
      </Text>
    </XStack>
  );
}

/** A small outlined fact chip — the ticket price and the number of spots. */
function FactChip({ text }: Readonly<{ text: string }>) {
  return (
    <XStack
      alignItems="center"
      paddingHorizontal={10}
      height={26}
      borderRadius={999}
      borderWidth={1}
      borderColor="$borderColor"
    >
      <Text fontSize={11.5} fontWeight="600" color="$color">
        {text}
      </Text>
    </XStack>
  );
}

/**
 * The card's cover image. An image that has since been deleted or moved 404s
 * at request time rather than arriving empty, so the dead URL is caught on the
 * error event and swapped for the placeholder — the MUI twin does the same.
 */
function AutoPodCover({ url }: Readonly<{ url: string }>) {
  const { muted, surface } = useThemeColors();
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <XStack
        width="100%"
        height={150}
        alignItems="center"
        justifyContent="center"
        backgroundColor={surface}
      >
        <MaterialIcons name="broken-image" size={28} color={muted} />
      </XStack>
    );
  }
  return (
    <AppImage
      source={{ uri: url }}
      style={{ width: '100%', height: 150 }}
      resizeMode="cover"
      onError={() => setBroken(true)}
    />
  );
}

/**
 * One Auto Pod, as every role sees it. The card itself is role-agnostic: the
 * three enrolment ticks and the pod's own details read the same to a venue, a
 * host and a club admin, and only the button differs — which is why the caller
 * passes it in rather than the card branching per role.
 *
 * The Tamagui twin of `@duncit/auto-pods`' `AutoPodCard` (rule 27).
 */
export function AutoPodCard({ row, labels, formatWhen, formatMoney, action }: Readonly<Props>) {
  const { muted, success } = useThemeColors();
  const image = firstImage(row);
  const waitingOn = autoPodWaitingOn(row);
  const venue = row.venue_claim;
  const subtitle = row.category_name
    ? `${row.auto_pod_no} · ${row.category_name}`
    : row.auto_pod_no;

  return (
    <YStack
      testID={`auto-pod-card-${row.id}`}
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
      overflow="hidden"
    >
      {image ? <AutoPodCover url={image} /> : null}

      <YStack gap={10} padding={12}>
        <YStack gap={2}>
          <Text fontSize={15} fontWeight="700" color="$color" numberOfLines={1}>
            {row.pod_title}
          </Text>
          <Text fontSize={11.5} color="$muted">
            {subtitle}
          </Text>
        </YStack>

        <AutoPodTicksRow row={row} labels={labels} />

        {venue ? (
          <YStack gap={4}>
            <DetailLine icon="place" value={venue.venue_name} tint={muted} />
            <DetailLine icon="event" value={formatWhen(venue.pod_date_time)} tint={muted} />
          </YStack>
        ) : null}

        <Separator borderColor="$borderColor" />

        <XStack gap={8} flexWrap="wrap">
          <FactChip text={`${labels.priceLabel}: ${formatMoney(row.pod_amount)}`} />
          <FactChip text={`${labels.spotsLabel}: ${row.no_of_spots}`} />
        </XStack>

        {typeof row.expected_host_earnings === 'number' ? (
          <Text fontSize={12.5} fontWeight="700" color={success}>
            {labels.expectedEarnings(formatMoney(row.expected_host_earnings))}
          </Text>
        ) : null}

        {waitingOn ? (
          <Text fontSize={11.5} color="$muted">
            {labels.waitingOn(waitingOn)}
          </Text>
        ) : null}

        {action}
      </YStack>
    </YStack>
  );
}
