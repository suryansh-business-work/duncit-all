import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { CommChannel } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  channel: CommChannel;
  icon: keyof typeof MaterialIcons.glyphMap;
  name: string;
  /** What choosing this channel leads to. */
  hint: string;
  /** Where it goes now — destination plus whether auth messages arrive. */
  summary: string;
  onPress: () => void;
}

/**
 * One channel on the hub: a door, and nothing else. Tamagui twin of mWeb's
 * ChannelLinkCard (rule 27).
 *
 * There is deliberately no control on this card. Everything about a channel —
 * its categories AND its authentication messages — is on the other side of it,
 * so the reader never has to hold two places in their head for one channel.
 */
export function ChannelLinkCard({
  channel,
  icon,
  name,
  hint,
  summary,
  onPress,
}: Readonly<Props>) {
  const { color, muted } = useThemeColors();

  return (
    <XStack
      testID={`comm-channel-${channel}`}
      role="button"
      aria-label={name}
      onPress={onPress}
      padding={16}
      borderRadius={18}
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$borderColor"
      alignItems="center"
      gap={12}
      pressStyle={{ opacity: 0.85 }}
    >
      <MaterialIcons name={icon} size={20} color={color} />
      <YStack flex={1} gap={2}>
        <Text fontSize={14.5} fontWeight="700" color="$color">
          {name}
        </Text>
        <Text fontSize={12.5} color="$muted">
          {hint}
        </Text>
        <Text fontSize={12} color="$muted" numberOfLines={1}>
          {summary}
        </Text>
      </YStack>
      <MaterialIcons name="chevron-right" size={22} color={muted} />
    </XStack>
  );
}
