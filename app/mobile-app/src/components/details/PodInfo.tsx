import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import { CategoryBreadcrumb } from '@/components/CategoryBreadcrumb';
import { SurfaceCard } from '@/components/SurfaceCard';
import { PodMetaRow } from '@/components/details/PodMetaRow';
import { TourAnchor } from '@/tours/TourAnchor';
import type { PodDetail } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { podSeatsTaken } from '@duncit/utils';
import { podModeLabel, podPriceLabel, podTimeChip, type TimeTone } from '@/utils/pod-format';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** A spot count this low is worth a second look before booking. */
const FEW_SPOTS = 3;

/** A 12% tint of a token colour, for a calm tonal pill (hex tokens only). */
const tint = (hex: string) => `${hex}1f`;

/** A pill with an optional icon. `fill`/`fg` default to the surface pill. */
function Chip({
  icon,
  label,
  fill = '$surface',
  fg = '$color',
  iconColor,
}: Readonly<{
  icon?: IconName;
  label: string;
  fill?: string;
  fg?: string;
  iconColor?: string;
}>) {
  return (
    <XStack
      alignItems="center"
      gap={6}
      height={32}
      borderRadius={999}
      paddingHorizontal={12}
      backgroundColor={fill}
    >
      {icon ? <MaterialIcons name={icon} size={16} color={iconColor} /> : null}
      <Text fontSize={13} fontWeight="600" color={fg}>
        {label}
      </Text>
    </XStack>
  );
}

function Stat({ label, value, warn }: Readonly<{ label: string; value: number; warn?: boolean }>) {
  return (
    <YStack flex={1}>
      <Text fontSize={12} fontWeight="500" color="$muted">
        {label}
      </Text>
      <Text fontSize={20} fontWeight="600" color={warn ? '$warning' : '$color'}>
        {value}
      </Text>
    </YStack>
  );
}

/** The pod's title block — title, who hosts it, what kind of pod it is, the
 * facts the tour's first step names (price · mode · when) and how full it is.
 * Sits on the page ground rather than in a card. RN twin of mWeb's PodOverview
 * + PodQuickStats. Detailed sections live in PodAccordions. */
export function PodInfo({
  pod,
  categoryCrumbs,
}: Readonly<{ pod: PodDetail; categoryCrumbs: readonly string[] }>) {
  const { t } = useTranslation();
  const { color, danger, warning } = useThemeColors();
  const host = pod.host_names.join(', ');
  const isVirtual = pod.pod_mode === 'VIRTUAL';
  const attendees = podSeatsTaken(pod);
  const hasSpots = pod.no_of_spots > 0;
  const remaining = hasSpots ? Math.max(pod.no_of_spots - attendees, 0) : 0;
  const time = podTimeChip(pod.pod_date_time, t);
  const tone: Record<TimeTone, string> = { error: danger, warning, info: semantic.info };
  const timeTone = time ? tone[time.tone] : color;

  return (
    <YStack paddingHorizontal={16} paddingTop={20} gap={12}>
      <YStack gap={4}>
        <Text fontSize={24} lineHeight={29} fontWeight="600" color="$color">
          {pod.pod_title}
        </Text>
        {host ? (
          <Text fontSize={14} color="$muted" numberOfLines={1}>
            {t('mweb.podDetails.hostedBy', { vars: { names: host } })}
          </Text>
        ) : null}
      </YStack>
      {categoryCrumbs.length > 0 ? (
        <PodMetaRow icon="category">
          <CategoryBreadcrumb crumbs={categoryCrumbs} />
        </PodMetaRow>
      ) : null}
      {/* The chip row carries all three facts the tour step names, in its order:
          price, Physical/Virtual, and when it runs. */}
      <TourAnchor tour="pod-details" anchor="pod-summary">
        <XStack gap={8} flexWrap="wrap">
          <Chip label={podPriceLabel(pod, t)} fill="$primarySoft" fg="$primary" />
          <Chip
            icon={isVirtual ? 'videocam' : 'place'}
            iconColor={color}
            label={podModeLabel(pod.pod_mode, t)}
          />
          {time ? (
            <Chip
              icon={time.tone === 'error' ? 'event-busy' : 'hourglass-bottom'}
              iconColor={timeTone}
              label={time.label}
              fill={tint(timeTone)}
            />
          ) : null}
        </XStack>
      </TourAnchor>
      <SurfaceCard flexDirection="row" gap={16} paddingVertical={12}>
        <Stat label={t('mweb.podDetails.peopleIn')} value={attendees} />
        <YStack width={1} alignSelf="stretch" backgroundColor="$borderColor" />
        {/* Half of a two-stat row, so the wrapper has to carry the flex on. */}
        <TourAnchor tour="pod-details" anchor="pod-spots" style={{ flex: 1 }}>
          <Stat
            label={t('mweb.podDetails.spotsLeft')}
            value={remaining}
            warn={hasSpots && remaining <= FEW_SPOTS}
          />
        </TourAnchor>
      </SurfaceCard>
    </YStack>
  );
}
