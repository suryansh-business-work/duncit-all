import type { Ref } from 'react';
import type { TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  testID: string;
  ariaLabel: string;
  placeholder: string;
  value: string;
  onChangeText: (next: string) => void;
  /** 52 on the Search screen, 48 on the in-screen list searches. */
  height?: number;
  autoFocus?: boolean;
  inputRef?: Ref<TextInput>;
}

/**
 * The calm search pill every Discover list shares: a surface pill with a muted
 * leading glass, borderless on the light ground (the card hairline in dark).
 * mWeb twin: pages/pod-list/SearchPillField.
 */
export function SearchPill({
  testID,
  ariaLabel,
  placeholder,
  value,
  onChangeText,
  height = 48,
  autoFocus,
  inputRef,
}: Readonly<Props>) {
  const { muted } = useThemeColors();
  return (
    <XStack
      flex={1}
      alignItems="center"
      gap={8}
      paddingHorizontal={16}
      height={height}
      borderRadius={999}
      borderWidth={1}
      borderColor="$cardBorder"
      backgroundColor="$surface"
    >
      <MaterialIcons name="search" size={20} color={muted} />
      <Input
        ref={inputRef}
        testID={testID}
        aria-label={ariaLabel}
        flex={1}
        unstyled
        autoFocus={autoFocus}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="$muted"
        color="$color"
        fontSize={15}
        returnKeyType="search"
      />
    </XStack>
  );
}
