import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { TICKET_CATEGORIES, categoryLabel } from './ticketCategories';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Dropdown-style category picker — the RN twin of mWeb's MUI `<Select>`. A
 * pressable field shows the selected label and a chevron; tapping it expands an
 * inline list of the same friendly categories mWeb offers.
 */
export function CategorySelect({ value, onChange }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const { color: ink, muted } = useThemeColors();

  return (
    <YStack gap={6}>
      <XStack
        testID="ticket-category"
        role="button"
        aria-label="Category"
        aria-expanded={open}
        onPress={() => setOpen((o) => !o)}
        alignItems="center"
        height={46}
        paddingHorizontal={12}
        borderRadius={10}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$background"
      >
        <MaterialIcons name="category" size={18} color={muted} />
        <Text flex={1} marginLeft={8} fontSize={14} color="$color">
          {categoryLabel(value)}
        </Text>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={20} color={ink} />
      </XStack>
      {open ? (
        <YStack
          testID="ticket-category-options"
          borderRadius={10}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
          overflow="hidden"
        >
          {TICKET_CATEGORIES.map((c) => {
            const selected = c.value === value;
            return (
              <XStack
                key={c.value}
                testID={`ticket-category-option-${c.value}`}
                role="button"
                aria-label={c.label}
                aria-pressed={selected}
                onPress={() => {
                  onChange(c.value);
                  setOpen(false);
                }}
                paddingHorizontal={12}
                paddingVertical={11}
                backgroundColor={selected ? '$primary' : 'transparent'}
                pressStyle={{ opacity: 0.8 }}
              >
                <Text
                  fontSize={14}
                  fontWeight={selected ? '800' : '600'}
                  color={selected ? '$onPrimary' : '$color'}
                >
                  {c.label}
                </Text>
              </XStack>
            );
          })}
        </YStack>
      ) : null}
    </YStack>
  );
}
