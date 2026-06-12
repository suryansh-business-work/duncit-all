import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { PodPlaceCharge } from './create-pod.types';

interface Props {
  value: PodPlaceCharge[];
  onChange: (next: PodPlaceCharge[]) => void;
}

const inputStyle = {
  size: '$4',
  backgroundColor: '$surface',
  color: '$color',
  placeholderTextColor: '$muted',
  borderColor: '$borderColor',
} as const;

/** Optional venue-side charges (entry, table, etc.) shown separately to users. */
export function PlaceChargesField({ value, onChange }: Readonly<Props>) {
  const { primary, danger } = useThemeColors();
  const update = (idx: number, patch: Partial<PodPlaceCharge>) =>
    onChange(value.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  const add = () => onChange([...value, { label: '', amount: 0, note: '' }]);
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  return (
    <YStack gap={10}>
      <Text fontSize={14} fontWeight="500" color="$color">
        Place charges
      </Text>
      {value.map((row, idx) => (
        <YStack
          key={idx}
          gap={6}
          padding={10}
          borderRadius={10}
          borderWidth={1}
          borderColor="$borderColor"
        >
          <Input
            testID={`charge-label-${idx}`}
            {...inputStyle}
            value={row.label}
            onChangeText={(text) => update(idx, { label: text })}
            placeholder="Label"
            aria-label="Charge label"
          />
          <Input
            testID={`charge-amount-${idx}`}
            {...inputStyle}
            keyboardType="numeric"
            value={String(row.amount)}
            onChangeText={(text) => update(idx, { amount: Number(text) || 0 })}
            placeholder="Amount (₹)"
            aria-label="Charge amount"
          />
          <Input
            testID={`charge-note-${idx}`}
            {...inputStyle}
            value={row.note}
            onChangeText={(text) => update(idx, { note: text })}
            placeholder="Note"
            aria-label="Charge note"
          />
          <XStack
            testID={`charge-remove-${idx}`}
            role="button"
            aria-label="Remove charge"
            onPress={() => remove(idx)}
            alignItems="center"
            gap={4}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="delete-outline" size={16} color={danger} />
            <Text fontSize={13} fontWeight="700" color="$danger">
              Remove
            </Text>
          </XStack>
        </YStack>
      ))}
      <XStack
        testID="charge-add"
        role="button"
        aria-label="Add charge"
        onPress={add}
        alignItems="center"
        gap={4}
        pressStyle={{ opacity: 0.7 }}
      >
        <MaterialIcons name="add" size={18} color={primary} />
        <Text fontSize={13} fontWeight="800" color="$primary">
          Add charge
        </Text>
      </XStack>
    </YStack>
  );
}
