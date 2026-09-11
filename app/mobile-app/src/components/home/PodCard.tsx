import { StyleSheet } from 'react-native';
import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { PressScale } from '@/animations/PressScale';
import { SurfaceCard } from '@/components/SurfaceCard';
import { ImagePill, PodCardInfo, PodSaveButton } from '@/components/home/PodCardParts';
import type { HomePod } from '@/hooks/useHomeFeed';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { podDateLabel, podImageUrl, podPlaceLabel, podPriceLabel } from '@/utils/pod-format';
import { imageSourceUrl, isVideoUrl, podSeatsTaken } from '@duncit/utils';

/** A card's widest render in device pixels — mWeb's twin asks for the same. */
const CARD_IMAGE_WIDTH = 720;
/** Every card is this tall at any width, so a rail's cards line up and the
 * full lists can size their rows up front. mWeb's PodCard draws the same. */
const CARD_HEIGHT = 240;
/** The width every Home rail gives its cards — mWeb's PodCard is fixed at it. */
export const POD_CARD_RAIL_WIDTH = 268;

interface PodCardProps {
  pod: HomePod;
  width?: number;
  onPress?: () => void;
  /** Show the place/address line. Off in the home feed (addresses are hidden there). */
  showPlace?: boolean;
  /** The category pill over the image (mock: "Sports"). */
  categoryLabel?: string | null;
  /** Save state + toggle; omit to hide the save button. */
  saved?: boolean;
  /** The toggle is in flight for THIS pod — the icon becomes a spinner. */
  saving?: boolean;
  onToggleSave?: () => void;
}

/**
 * The event card: a white card with the pod's image on top (the date pill and
 * the save button over it, the category at its foot), then who is coming, the
 * title with the price beside it, and the place. Tamagui twin of mWeb's
 * PodCard.
 */
export function PodCard({
  pod,
  width = 300,
  onPress,
  showPlace = true,
  categoryLabel,
  saved = false,
  saving = false,
  onToggleSave,
}: Readonly<PodCardProps>) {
  const stored = podImageUrl(pod);
  // Card-sized copy of a photo (3-4x fewer bytes). A video address is left alone:
  // resizing one is ImageKit's metered video re-encode.
  const image = stored && !isVideoUrl(stored) ? imageSourceUrl(stored, CARD_IMAGE_WIDTH) : stored;
  const place = showPlace ? podPlaceLabel(pod) : '';
  const { muted } = useThemeColors();
  const { t } = useTranslation();

  const taken = podSeatsTaken(pod);
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
      <SurfaceCard width={width} height={CARD_HEIGHT} padding={8} overflow="hidden">
        <YStack flex={1} borderRadius={18} overflow="hidden" backgroundColor="$soft">
          {image ? (
            <AppImage source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <YStack flex={1} alignItems="center" justifyContent="center">
              <MaterialIcons name="event" size={40} color={muted} />
            </YStack>
          )}
          <ImagePill top={8} maxWidth={width - 76}>
            <MaterialIcons name="event" size={14} color={muted} />
            <Text fontSize={11.5} fontWeight="600" color="$color" numberOfLines={1} flexShrink={1}>
              {podDateLabel(pod)}
            </Text>
          </ImagePill>
          {categoryLabel ? (
            <ImagePill maxWidth={width - 32}>
              <Text fontSize={11} fontWeight="600" color="$color" numberOfLines={1} flexShrink={1}>
                {categoryLabel}
              </Text>
            </ImagePill>
          ) : null}
          {onToggleSave ? (
            <PodSaveButton
              podId={pod.pod_id}
              saved={saved}
              saving={saving}
              label={saved ? t('mweb.home.savedPod') : t('mweb.home.savePod')}
              onPress={onToggleSave}
            />
          ) : null}
        </YStack>
        <PodCardInfo
          title={pod.pod_title}
          price={podPriceLabel(pod, t)}
          joiningText={taken > 0 ? t('mweb.home.joiningNow', { count: taken }) : ''}
          spotsText={spotsText}
          subText={place}
        />
      </SurfaceCard>
    </PressScale>
  );
}
