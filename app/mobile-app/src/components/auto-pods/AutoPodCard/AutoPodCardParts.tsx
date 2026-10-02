import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';

/** One labelled detail line with its icon: the pinned city, the venue, the slot. */
export function DetailLine({
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
export function ModeTag({ virtual, label }: Readonly<{ virtual: boolean; label: string }>) {
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
export function FactChip({ text }: Readonly<{ text: string }>) {
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
export function AutoPodCover({ url }: Readonly<{ url: string }>) {
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
