import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  error?: string;
  max?: number;
  testID: string;
}

/** Enter-to-add chip list backed by a string[] field; tap a chip to remove it. */
export function ChipArrayField({
  label,
  value,
  onChange,
  placeholder,
  error,
  max = 20,
  testID,
}: Readonly<Props>) {
  const [draft, setDraft] = useState('');
  const { onPrimary } = useThemeColors();

  const commit = () => {
    const next = draft.trim();
    if (next && !value.includes(next) && value.length < max) {
      onChange([...value, next]);
    }
    setDraft('');
  };

  return (
    <YStack gap={6}>
      <Text fontSize={14} fontWeight="500" color="$color">
        {label}
      </Text>
      {value.length > 0 ? (
        <XStack gap={6} flexWrap="wrap">
          {value.map((tag) => (
            <XStack
              key={tag}
              testID={`${testID}-chip-${tag}`}
              role="button"
              aria-label={`Remove ${tag}`}
              onPress={() => onChange(value.filter((item) => item !== tag))}
              alignItems="center"
              gap={4}
              paddingHorizontal={12}
              paddingVertical={7}
              borderRadius={999}
              backgroundColor="$primary"
              pressStyle={{ opacity: 0.85 }}
            >
              <Text fontSize={12.5} fontWeight="800" color="$onPrimary">
                {tag}
              </Text>
              <MaterialIcons name="close" size={14} color={onPrimary} />
            </XStack>
          ))}
        </XStack>
      ) : null}
      <Input
        testID={`${testID}-input`}
        size="$4"
        backgroundColor="$surface"
        color="$color"
        placeholderTextColor="$muted"
        borderColor={error ? '$danger' : '$borderColor'}
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={commit}
        onBlur={commit}
        placeholder={placeholder ?? 'Type and press enter'}
        aria-label={label}
      />
      {error ? (
        <Text testID={`${testID}-error`} fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
