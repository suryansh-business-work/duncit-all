import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { coverImageUrl, imageSourceUrl } from '@duncit/utils';

import { PressScale } from '@/animations/PressScale';
import { AppImage } from '@/components/AppImage';
import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { ClubPod } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDate } from '@/utils/date-format';
import { podPriceLabel } from '@/utils/pod-format';

const CARD_WIDTH = 180;
/** Twice the card's width, for a sharp photo without the full-size file. */
const IMAGE_WIDTH = 360;

interface Props {
  pod: ClubPod;
  onPress: () => void;
}

/**
 * Compact fixed-width pod card in the Pods Schedule rails — the photo inside
 * the padding with a small date pill over its top-left, the title, and a green
 * price pill that opens the pod. mWeb twin: club-details-page/ClubPodRailCard.
 */
export function ClubPodRailCard({ pod, onPress }: Readonly<Props>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const cover = coverImageUrl(pod.pod_images_and_videos);
  const dateLabel = formatDate(pod.pod_date_time).toUpperCase();

  return (
    <PressScale
      testID={`pod-card-${pod.pod_id}`}
      accessibilityLabel={pod.pod_title}
      onPress={onPress}
    >
      <SurfaceCard width={CARD_WIDTH} padding={8}>
        <YStack
          height={104}
          borderRadius={18}
          overflow="hidden"
          backgroundColor="$soft"
          alignItems="center"
          justifyContent="center"
        >
          {cover ? (
            <AppImage
              source={{ uri: imageSourceUrl(cover, IMAGE_WIDTH) }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <MaterialIcons name="event" size={24} color={accent} />
          )}
          {dateLabel ? (
            <XStack
              position="absolute"
              top={8}
              left={8}
              paddingHorizontal={8}
              paddingVertical={2}
              borderRadius={999}
              backgroundColor="$surface"
            >
              <Text fontSize={11} fontWeight="600" color="$color">
                {dateLabel}
              </Text>
            </XStack>
          ) : null}
        </YStack>
        <YStack paddingHorizontal={4} paddingTop={8} gap={8}>
          <Text
            fontSize={14}
            fontWeight="600"
            lineHeight={18}
            minHeight={36}
            color="$color"
            numberOfLines={2}
          >
            {pod.pod_title}
          </Text>
          <DuncitButton fullWidth size="sm" label={podPriceLabel(pod, t)} onPress={onPress} />
        </YStack>
      </SurfaceCard>
    </PressScale>
  );
}
