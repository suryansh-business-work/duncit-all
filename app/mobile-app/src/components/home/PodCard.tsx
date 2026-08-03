import { StyleSheet } from 'react-native';
import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { PressScale } from '@/animations/PressScale';
import type { HomePod } from '@/hooks/useHomeFeed';
import { useThemeStore } from '@/stores/theme.store';
import { useTranslation } from '@/hooks/useTranslation';
import { podDateLabel, podImageUrl, podPlaceLabel, podPriceLabel } from '@/utils/pod-format';

interface PodCardProps {
  pod: HomePod;
  width?: number;
  onPress?: () => void;
  /** Show the place/address line. Off in the home feed (addresses are hidden there). */
  showPlace?: boolean;
  /** The category chip over the image (mock: "Sports"). */
  categoryLabel?: string | null;
  /** Heart state + toggle; omit to hide the heart. */
  saved?: boolean;
  onToggleSave?: () => void;
}

interface PodInfoPanelProps {
  pod: HomePod;
  dark: boolean;
  spotsText: string;
  place: string;
  /** "N joining now" chip copy; empty hides the chip (mWeb twin parity). */
  joiningText: string;
}

/** The translucent bottom panel: date, big title, spots left, price, place.
 * Module scope (S6478) and out of PodCard to keep its complexity in bounds. */
function PodInfoPanel({ pod, dark, spotsText, place, joiningText }: Readonly<PodInfoPanelProps>) {
  const panelBg = dark ? 'rgba(17,26,46,0.88)' : 'rgba(255,255,255,0.90)';
  const panelBorder = dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)';
  const mutedInk = dark ? '#9aa3b2' : '#6b7280';
  return (
    <YStack
      position="absolute"
      left={10}
      right={10}
      bottom={10}
      padding={11}
      gap={3}
      borderRadius={14}
      backgroundColor={panelBg}
      borderWidth={1}
      borderColor={panelBorder}
    >
      <XStack alignItems="center" gap={6} flexWrap="wrap">
        <XStack alignItems="center" gap={4} flexShrink={1}>
          <MaterialIcons name="event" size={12} color={mutedInk} />
          <Text fontSize={11} fontWeight="600" color="$muted" numberOfLines={1}>
            {podDateLabel(pod)}
          </Text>
        </XStack>
        {joiningText ? (
          <XStack
            backgroundColor="rgba(34,197,94,0.18)"
            borderRadius={999}
            paddingHorizontal={8}
            paddingVertical={2}
          >
            <Text fontSize={10} fontWeight="700" color="#22c55e" numberOfLines={1}>
              {joiningText}
            </Text>
          </XStack>
        ) : null}
      </XStack>
      <Text fontSize={18} fontWeight="700" color="$color" numberOfLines={1}>
        {pod.pod_title}
      </Text>
      <XStack alignItems="center" justifyContent="space-between" gap={6}>
        <XStack alignItems="center" gap={4} flexShrink={1}>
          <MaterialIcons name="group" size={13} color={mutedInk} />
          <Text fontSize={11.5} fontWeight="600" color="$muted" numberOfLines={1}>
            {spotsText}
          </Text>
        </XStack>
        <XStack
          backgroundColor="$primary"
          borderRadius={999}
          paddingHorizontal={10}
          paddingVertical={3}
        >
          <Text color="$onPrimary" fontSize={11.5} fontWeight="700">
            {podPriceLabel(pod)}
          </Text>
        </XStack>
      </XStack>
      {place ? (
        <XStack alignItems="center" gap={4}>
          <MaterialIcons name="place" size={12} color={mutedInk} />
          <Text fontSize={11} fontWeight="600" color="$muted" numberOfLines={1}>
            {place}
          </Text>
        </XStack>
      ) : null}
    </YStack>
  );
}

/**
 * Image-first pod card (mock): full-bleed media, the category chip and heart
 * overlaid on top, and a translucent info panel — date, big title, spots left
 * and the price pill — floating over the bottom. Tamagui twin of mWeb's
 * PodCard; no backdrop blur natively, so the panel runs a higher alpha.
 */
export function PodCard({
  pod,
  width = 300,
  onPress,
  showPlace = true,
  categoryLabel,
  saved = false,
  onToggleSave,
}: Readonly<PodCardProps>) {
  const image = podImageUrl(pod);
  const place = showPlace ? podPlaceLabel(pod) : '';
  const dark = useThemeStore((s) => s.scheme) === 'dark';
  const { t } = useTranslation();

  const taken = (pod as { pod_attendees?: string[] }).pod_attendees?.length ?? 0;
  const spotsLeft = pod.no_of_spots > 0 ? Math.max(0, pod.no_of_spots - taken) : 0;
  // Fallback matches the mWeb twin exactly (rule 27): "3/8", or just "3" when
  // the pod has no spot limit.
  const spotsSuffix = pod.no_of_spots > 0 ? `/${pod.no_of_spots}` : '';
  let spotsText = `${taken}${spotsSuffix}`;
  if (spotsLeft === 1) spotsText = t('mweb.home.spotsLeftOne');
  else if (spotsLeft > 1) spotsText = t('mweb.home.spotsLeftMany', { count: spotsLeft });

  return (
    <PressScale
      testID={`pod-card-${pod.pod_id}`}
      accessibilityLabel={pod.pod_title}
      onPress={onPress}
    >
      <YStack
        width={width}
        height={240}
        borderRadius={18}
        overflow="hidden"
        backgroundColor="$muted"
      >
        {image ? (
          <AppImage source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <YStack flex={1} alignItems="center" justifyContent="center">
            <MaterialIcons name="event" size={56} color="rgba(255,255,255,0.85)" />
          </YStack>
        )}

        {categoryLabel ? (
          <XStack
            position="absolute"
            top={10}
            left={10}
            alignItems="center"
            backgroundColor="rgba(9,7,18,0.62)"
            borderRadius={999}
            paddingHorizontal={10}
            paddingVertical={4}
          >
            <Text color="#ffffff" fontSize={11} fontWeight="600" numberOfLines={1}>
              {categoryLabel}
            </Text>
          </XStack>
        ) : null}

        {onToggleSave ? (
          <XStack
            testID={`pod-card-save-${pod.pod_id}`}
            role="button"
            aria-label={saved ? t('mweb.home.savedPod') : t('mweb.home.savePod')}
            aria-pressed={saved}
            onPress={onToggleSave}
            position="absolute"
            top={8}
            right={8}
            width={32}
            height={32}
            borderRadius={16}
            alignItems="center"
            justifyContent="center"
            backgroundColor="rgba(9,7,18,0.35)"
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons
              name={saved ? 'favorite' : 'favorite-border'}
              size={17}
              color={saved ? '#ff4f73' : '#ffffff'}
            />
          </XStack>
        ) : null}

        <PodInfoPanel
          pod={pod}
          dark={dark}
          spotsText={spotsText}
          place={place}
          joiningText={taken > 0 ? t('mweb.home.joiningNow', { count: taken }) : ''}
        />
      </YStack>
    </PressScale>
  );
}
