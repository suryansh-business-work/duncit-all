import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  title: string;
  subtitle?: string;
  closeLabel: string;
  testID: string;
  /** Omitted when the footer already offers a way out. */
  onClose?: () => void;
}

/**
 * The pinned top of a dialog.
 *
 * Deliberately NOT inside the scroll area: a title that scrolls away leaves the
 * reader with no idea what the list under their thumb belongs to.
 *
 * Neither line is truncated. A pod title, a venue name or an error message can
 * be any length, and clipping the one thing that identifies the dialog is worse
 * than two lines of header — so the text wraps and the header grows.
 */
export function DialogHeader({ title, subtitle, closeLabel, testID, onClose }: Readonly<Props>) {
  const { color: ink } = useThemeColors();
  return (
    <XStack
      alignItems="flex-start"
      gap={8}
      paddingHorizontal={16}
      paddingTop={16}
      paddingBottom={4}
    >
      <YStack flex={1} gap={2}>
        <Text fontSize={16.5} fontWeight="800" color="$color">
          {title}
        </Text>
        {subtitle ? (
          <Text fontSize={12.5} color="$muted" lineHeight={17}>
            {subtitle}
          </Text>
        ) : null}
      </YStack>
      {onClose ? (
        <XStack
          testID={`${testID}-close`}
          role="button"
          aria-label={closeLabel}
          onPress={onClose}
          width={32}
          height={32}
          alignItems="center"
          justifyContent="center"
          borderRadius={16}
          pressStyle={PRESS_STYLE.inline}
        >
          <MaterialIcons name="close" size={19} color={ink} />
        </XStack>
      ) : null}
    </XStack>
  );
}
