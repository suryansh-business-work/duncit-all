import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { CommChannel } from '@duncit/utils';

import { IconDisc } from '@/components/account/IconDisc';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  channel: CommChannel;
  icon: keyof typeof MaterialIcons.glyphMap;
  name: string;
  /** Where it goes now — destination plus whether auth messages arrive. */
  summary: string;
  onPress: () => void;
}

/**
 * One channel on the hub: a row in the hub's card, a door and nothing else.
 * Tamagui twin of mWeb's ChannelLinkCard (rule 27).
 *
 * There is deliberately no control on this row. Everything about a channel —
 * its categories AND its authentication messages — is on the other side of it,
 * so the reader never has to hold two places in their head for one channel.
 */
export function ChannelLinkCard({ channel, icon, name, summary, onPress }: Readonly<Props>) {
  const { muted } = useThemeColors();

  return (
    <XStack
      testID={`comm-channel-${channel}`}
      role="button"
      aria-label={name}
      onPress={onPress}
      paddingHorizontal={16}
      paddingVertical={14}
      alignItems="center"
      gap={16}
      pressStyle={PRESS_STYLE.row}
    >
      <IconDisc icon={icon} />
      <YStack flex={1} gap={2}>
        <Text fontSize={15} fontWeight="500" color="$color">
          {name}
        </Text>
        <Text fontSize={14} color="$muted" numberOfLines={1}>
          {summary}
        </Text>
      </YStack>
      <MaterialIcons name="chevron-right" size={22} color={muted} />
    </XStack>
  );
}
