import { useState, type ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Separator, Text, XStack, YStack } from 'tamagui';
import {
  autoPodCityLabel,
  autoPodMissingRoles,
  autoPodPriced,
  autoPodRoleEarnings,
  coverImageUrl,
  type AutoPodLabels,
  type AutoPodRole,
  type AutoPodRow,
} from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import { AutoPodExpiryNote } from '@/components/auto-pods/AutoPodExpiryNote';
import { AutoPodTicksRow } from '@/components/auto-pods/AutoPodTicksRow';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  row: AutoPodRow;
  /**
   * Whose queue this card is in. Each role is paid for something different, so
   * the "You could earn" line reads that role's own figure — a venue used to be
   * shown the HOST's payout, which is a different number entirely.
   */
  role: AutoPodRole;
  labels: AutoPodLabels;
  /** Formats the slot window in the viewer's configured date/time settings. */
  formatWhen: (iso: string) => string;
  /** Formats money in the viewer's currency. */
  formatMoney: (amount: number) => string;
  /** The role's primary button — the caller owns the action. */
  action?: ReactNode;
  /** The "View Potential Earnings" control, under the card's details. */
  earningsAction?: ReactNode;
  /** What this viewer worked out in that sheet — it wins over the server's. */
  earnings?: number | null;
}

const firstImage = (row: AutoPodRow): string | null =>
  coverImageUrl(row.pod_images_and_videos) ?? null;

/** One labelled detail line with its icon: the pinned city, the venue, the slot. */
function DetailLine({
  icon,
  value,
  tint,
}: Readonly<{
  icon: 'location-city' | 'place' | 'event' | 'videocam';
  value: string;
  tint: string;
}>) {
  return (
    <XStack alignItems="flex-start" gap={6}>
      <MaterialIcons name={icon} size={18} color={tint} style={{ marginTop: 1 }} />
      <Text flex={1} fontSize={14} color="$color">
        {value}
      </Text>
    </XStack>
  );
}

/**
 * Physical or virtual, as a chip beside the title. Every card wears one: a
 * virtual offer waits on two partners and a physical one on three, and that
 * is the first thing a partner needs to know. The MUI twin draws the same tag.
 */
function ModeTag({ virtual, label }: Readonly<{ virtual: boolean; label: string }>) {
  const { muted, onPrimary } = useThemeColors();
  return (
    <XStack
      testID="auto-pod-mode-tag"
      alignItems="center"
      gap={4}
      paddingHorizontal={10}
      height={32}
      borderRadius={999}
      backgroundColor={virtual ? '$primary' : '$soft'}
    >
      <MaterialIcons
        name={virtual ? 'videocam' : 'place'}
        size={16}
        color={virtual ? onPrimary : muted}
      />
      <Text fontSize={13} fontWeight="600" color={virtual ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

/** A small outlined fact chip — the ticket price and the number of spots. */
function FactChip({ text }: Readonly<{ text: string }>) {
  return (
    <XStack
      alignItems="center"
      paddingHorizontal={12}
      height={32}
      borderRadius={999}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <Text fontSize={13} fontWeight="600" color="$color">
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
  const { muted } = useThemeColors();
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <XStack
        width="100%"
        height={150}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$soft"
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
 * three enrolment ticks, the pinned city and the pod's own details read the
 * same to a venue, a host and a club admin, and only the button differs —
 * which is why the caller passes it in rather than the card branching per role.
 *
 * The Tamagui twin of `@duncit/auto-pods`' `AutoPodCard` (rule 27).
 */
export function AutoPodCard({
  row,
  role,
  labels,
  formatWhen,
  formatMoney,
  action,
  earningsAction,
  earnings,
}: Readonly<Props>) {
  const { muted, success } = useThemeColors();
  // The cover runs edge to edge under the card's own 24px corners — exactly as
  // the MUI twin's CardMedia does, so no inner media radius here (rule 27).
  const image = firstImage(row);
  const missing = autoPodMissingRoles(row);
  const venue = row.venue_claim;
  const virtual = row.pod_mode === 'VIRTUAL';
  const city = autoPodCityLabel(row.location);
  const cityLine = city ? labels.pinnedTo(city) : labels.unpinned;
  const modeLabel = virtual ? labels.modeVirtual : labels.modePhysical;
  // The template carries no price: until a host sets one the card says who will.
  const priced = autoPodPriced(row);
  const earning = autoPodRoleEarnings(row, role, earnings);
  const subtitle = row.category_name
    ? `${row.auto_pod_no} · ${row.category_name}`
    : row.auto_pod_no;

  return (
    <SurfaceCard testID={`auto-pod-card-${row.id}`} padding={0} overflow="hidden">
      {image ? <AutoPodCover url={image} /> : null}

      <YStack gap={10} padding={16}>
        <YStack gap={2}>
          <XStack alignItems="center" gap={8}>
            <Text flex={1} fontSize={16} fontWeight="600" color="$color" numberOfLines={1}>
              {row.pod_title}
            </Text>
            <ModeTag virtual={virtual} label={modeLabel} />
          </XStack>
          <Text fontSize={12} color="$muted">
            {subtitle}
          </Text>
        </YStack>

        <AutoPodTicksRow row={row} labels={labels} />

        <YStack gap={4}>
          <DetailLine icon="location-city" value={cityLine} tint={muted} />
          {virtual ? <DetailLine icon="videocam" value={labels.virtualPod} tint={muted} /> : null}
          {venue ? (
            <>
              <DetailLine icon="place" value={venue.venue_name} tint={muted} />
              <DetailLine icon="event" value={formatWhen(venue.pod_date_time)} tint={muted} />
            </>
          ) : null}
          {earningsAction}
        </YStack>

        <Separator borderColor="$borderColor" />

        {priced ? (
          <XStack gap={8} flexWrap="wrap">
            <FactChip text={`${labels.priceLabel}: ${formatMoney(row.pod_amount)}`} />
            <FactChip text={`${labels.spotsLabel}: ${row.no_of_spots}`} />
          </XStack>
        ) : (
          <Text testID="auto-pod-priced-by-host" fontSize={12} color="$muted">
            {labels.pricedByHost}
          </Text>
        )}

        {/* "You could earn 1,500" — or just "You could earn" until this
            viewer has priced the pod in the calculator above. */}
        <Text testID="auto-pod-earnings" fontSize={14} fontWeight="600" color={success}>
          {earning === null
            ? labels.earningsUnknown
            : labels.expectedEarnings(formatMoney(earning))}
        </Text>

        <AutoPodExpiryNote expiresAt={row.expires_at} labels={labels} />

        {missing.length > 0 ? (
          <Text fontSize={12} color="$muted">
            {labels.waitingFor(missing)}
          </Text>
        ) : null}

        {action}
      </YStack>
    </SurfaceCard>
  );
}
