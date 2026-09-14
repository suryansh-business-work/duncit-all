import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { FIELD_HEIGHT, FIELD_RADIUS } from '@/components/Field';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  testID: string;
  label: string;
  /** The picked value's text, or empty while nothing is picked. */
  text: string;
  placeholder: string;
  disabled?: boolean;
  hasError: boolean;
  leading?: ReactNode;
  onOpen: () => void;
}

/**
 * The closed SelectSheet: a field-shaped button named by its label, reading
 * the current pick (or the placeholder) as its hint.
 */
export function SelectTrigger({
  testID,
  label,
  text,
  placeholder,
  disabled,
  hasError,
  leading,
  onOpen,
}: Readonly<Props>) {
  const { muted } = useThemeColors();
  return (
    <XStack
      testID={`${testID}-trigger`}
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      accessibilityHint={text || placeholder}
      tabIndex={0}
      onPress={disabled ? undefined : onOpen}
      alignItems="center"
      gap={8}
      height={FIELD_HEIGHT}
      paddingHorizontal={14}
      borderRadius={FIELD_RADIUS}
      borderWidth={1}
      borderColor={hasError ? '$danger' : '$inputBorder'}
      backgroundColor="$surface"
      opacity={disabled ? 0.5 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      {leading}
      <Text flex={1} fontSize={15} color={text ? '$color' : '$muted'} numberOfLines={1}>
        {text || placeholder}
      </Text>
      <MaterialIcons name="expand-more" size={22} color={muted} />
    </XStack>
  );
}
