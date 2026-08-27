import { useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { PodPlaceCharge } from './create-pod.types';
import { PRESS_STYLE } from '@duncit/buttons-native';

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
  const { t } = useTranslation();
  const chargeLabel = t('mweb.createPod.chargeLabel');
  const chargeAmount = t('mweb.createPod.chargeAmount');
  const chargeNote = t('mweb.createPod.chargeNote');
  // Stable per-row keys (the rows have no id) so edits don't remount inputs and
  // a middle-removal can't shuffle the wrong row — never the array index (S6479).
  const keys = useRef<string[]>([]);
  const seq = useRef(0);
  while (keys.current.length < value.length) {
    seq.current += 1;
    keys.current.push(`charge-${seq.current}`);
  }
  const update = (idx: number, patch: Partial<PodPlaceCharge>) =>
    onChange(value.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  const add = () => onChange([...value, { label: '', amount: 0, note: '' }]);
  const remove = (idx: number) => {
    keys.current.splice(idx, 1);
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <YStack gap={10}>
      <Text fontSize={14} fontWeight="500" color="$color">
        {t('mweb.createPod.placeCharges')}
      </Text>
      {value.map((row, idx) => (
        <YStack
          key={keys.current[idx]}
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
            placeholder={chargeLabel}
            aria-label={chargeLabel}
          />
          <Input
            testID={`charge-amount-${idx}`}
            {...inputStyle}
            keyboardType="numeric"
            value={String(row.amount)}
            onChangeText={(text) => update(idx, { amount: Number(text) || 0 })}
            placeholder={chargeAmount}
            aria-label={chargeAmount}
          />
          <Input
            testID={`charge-note-${idx}`}
            {...inputStyle}
            value={row.note}
            onChangeText={(text) => update(idx, { note: text })}
            placeholder={chargeNote}
            aria-label={chargeNote}
          />
          <XStack
            testID={`charge-remove-${idx}`}
            role="button"
            aria-label={t('mweb.createPod.removeCharge')}
            onPress={() => remove(idx)}
            alignItems="center"
            gap={4}
            pressStyle={PRESS_STYLE.row}
          >
            <MaterialIcons name="delete-outline" size={16} color={danger} />
            <Text fontSize={13} fontWeight="700" color="$danger">
              {t('mweb.createPod.remove')}
            </Text>
          </XStack>
        </YStack>
      ))}
      <XStack
        testID="charge-add"
        role="button"
        aria-label={t('mweb.createPod.addCharge')}
        onPress={add}
        alignItems="center"
        gap={4}
        pressStyle={PRESS_STYLE.row}
      >
        <MaterialIcons name="add" size={18} color={primary} />
        <Text fontSize={13} fontWeight="600" color="$primary">
          {t('mweb.createPod.addCharge')}
        </Text>
      </XStack>
    </YStack>
  );
}
