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
      gap={12}
      paddingHorizontal={20}
      paddingTop={20}
      paddingBottom={8}
    >
      <YStack flex={1} gap={4} paddingTop={onClose ? 6 : 0}>
        <Text fontSize={18} lineHeight={23} fontWeight="600" color="$color">
          {title}
        </Text>
        {subtitle ? (
          <Text fontSize={14} color="$muted" lineHeight={19}>
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
          width={36}
          height={36}
          alignItems="center"
          justifyContent="center"
          borderRadius={18}
          backgroundColor="$soft"
          pressStyle={PRESS_STYLE.control}
        >
          <MaterialIcons name="close" size={20} color={ink} />
        </XStack>
      ) : null}
    </XStack>
  );
}
