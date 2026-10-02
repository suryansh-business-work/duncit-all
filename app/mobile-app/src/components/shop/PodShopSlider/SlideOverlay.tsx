import { Linking } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { PRESS_STYLE } from '@duncit/buttons-native';

import type { SliderMedia } from './types';

/** Open a slide CTA target (external URL or configured deep link). */
export function openSliderCta(url: string): void {
  const target = url.trim();
  if (!target) return;
  Linking.openURL(target).catch(() => undefined);
}

/** Overlay copy + CTA on a slide; hoisted so it isn't redefined each render. */
export function SlideOverlay({ media }: Readonly<{ media: SliderMedia }>) {
  if (!media.heading && !media.subheading && !media.cta_label) return null;
  return (
    <YStack
      position="absolute"
      top={0}
      bottom={0}
      left={0}
      right={0}
      justifyContent="center"
      padding={20}
      backgroundColor="rgba(0,0,0,0.35)"
    >
      {media.heading ? (
        <Text role="heading" fontSize={24} fontWeight="600" color="#ffffff" maxWidth={260}>
          {media.heading}
        </Text>
      ) : null}
      {media.subheading ? (
        <Text fontSize={13} color="rgba(255,255,255,0.92)" marginTop={6} maxWidth={240}>
          {media.subheading}
        </Text>
      ) : null}
      {media.cta_label ? (
        <XStack
          testID="pod-shop-slide-cta"
          role="button"
          tabIndex={0}
          aria-label={media.cta_label}
          onPress={() => openSliderCta(media.cta_url)}
          marginTop={14}
          alignSelf="flex-start"
          paddingHorizontal={16}
          paddingVertical={9}
          borderRadius={999}
          backgroundColor="#ffffff"
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={13} fontWeight="600" color="$accent">
            {media.cta_label}
          </Text>
        </XStack>
      ) : null}
    </YStack>
  );
}
