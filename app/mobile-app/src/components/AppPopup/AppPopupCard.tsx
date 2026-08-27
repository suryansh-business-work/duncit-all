import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { AppPopupSize } from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import { PrimaryButton } from '@/components/PrimaryButton';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface AppPopupCardProps {
  imageUrl: string;
  /** The box the art is drawn in, already sized to its own aspect. */
  box: AppPopupSize;
  ctaLabel: string;
  showCta: boolean;
  closeLabel: string;
  showClose: boolean;
  /** Shown when the campaign turned the ✕ off — the backdrop still closes it. */
  closeHint: string;
  onClose: () => void;
  onCta: () => void;
  onImageLoad: (size: AppPopupSize) => void;
}

const CARD_RADIUS = 24;
const CLOSE_SIZE = 34;

/**
 * The campaign card: the artwork, the ✕ floating over its top-right corner, and
 * a footer carrying the CTA.
 *
 * The card takes the image's width exactly, so the art meets the card's edges
 * on three sides with no letterbox bars — which is why the box is computed from
 * the picture's own aspect rather than from the screen.
 */
export function AppPopupCard({
  imageUrl,
  box,
  ctaLabel,
  showCta,
  closeLabel,
  showClose,
  closeHint,
  onClose,
  onCta,
  onImageLoad,
}: Readonly<AppPopupCardProps>) {
  return (
    <YStack
      testID="app-popup-card"
      width={box.width}
      borderRadius={CARD_RADIUS}
      overflow="hidden"
      backgroundColor="$surface"
      shadowColor="#000000"
      shadowOpacity={0.35}
      shadowRadius={28}
      shadowOffset={{ width: 0, height: 16 }}
    >
      <YStack width={box.width} height={box.height}>
        <AppImage
          testID="app-popup-image"
          source={{ uri: imageUrl }}
          style={{ width: box.width, height: box.height }}
          // The box already matches the art's aspect, so `cover` fits exactly
          // and, unlike `contain`, cannot leave a hairline gap from rounding.
          resizeMode="cover"
          onLoad={onImageLoad}
        />
        {showClose ? (
          <XStack
            pressStyle={PRESS_STYLE.surface}
            testID="app-popup-close"
            role="button"
            aria-label={closeLabel}
            onPress={onClose}
            position="absolute"
            top={10}
            right={10}
            width={CLOSE_SIZE}
            height={CLOSE_SIZE}
            borderRadius={CLOSE_SIZE / 2}
            backgroundColor="rgba(0,0,0,0.55)"
            alignItems="center"
            justifyContent="center"
          >
            <MaterialIcons name="close" size={20} color="#ffffff" />
          </XStack>
        ) : null}
      </YStack>

      <AppPopupFooter
        ctaLabel={ctaLabel}
        showCta={showCta}
        closeHint={closeHint}
        showHint={!showClose}
        onCta={onCta}
      />
    </YStack>
  );
}

interface AppPopupFooterProps {
  ctaLabel: string;
  showCta: boolean;
  closeHint: string;
  showHint: boolean;
  onCta: () => void;
}

/** The strip under the art. Absent entirely when a campaign has neither a CTA
 * nor a hint to show, so the card is then pure artwork. */
function AppPopupFooter({
  ctaLabel,
  showCta,
  closeHint,
  showHint,
  onCta,
}: Readonly<AppPopupFooterProps>) {
  if (!showCta && !showHint) return null;
  return (
    <YStack padding={14} gap={8}>
      {showCta ? <PrimaryButton testID="app-popup-cta" label={ctaLabel} onPress={onCta} /> : null}
      {showHint ? (
        <Text testID="app-popup-hint" textAlign="center" fontSize={13} color="$muted">
          {closeHint}
        </Text>
      ) : null}
    </YStack>
  );
}
