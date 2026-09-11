import { type ReactNode, useMemo, useState } from 'react';
import { Modal } from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { Input, ScrollView, Text, XStack, YStack } from 'tamagui';

import { FIELD_HEIGHT, FIELD_RADIUS, FieldLabel } from '@/components/Field';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { SelectOptionRow } from './SelectOptionRow';

export interface SelectOption {
  value: string;
  label: string;
  flag?: string;
  /** Optional trailing text (e.g. a dial code). */
  hint?: string;
}

interface Props {
  testID: string;
  label: string;
  value: string;
  /** Text shown in the trigger when a value is set (e.g. a dial code). */
  display?: string;
  placeholder: string;
  options: SelectOption[];
  disabled?: boolean;
  error?: string;
  /** Trigger affordance: 'left' shows a flag, 'right' an icon. */
  leading?: ReactNode;
  onPick: (value: string) => void;
}

const matches = (option: SelectOption, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    option.label.toLowerCase().includes(q) ||
    option.value.toLowerCase().includes(q) ||
    (option.hint ?? '').toLowerCase().includes(q)
  );
};

/**
 * Reusable labelled select — a Tamagui trigger that opens a searchable Modal
 * (wrapped in ModalThemeScope). Tamagui has no native <select>; this mirrors
 * mWeb's MUI dropdowns/autocomplete so both apps offer an identical picker.
 */
export function SelectSheet({
  testID,
  label,
  value,
  display,
  placeholder,
  options,
  disabled,
  error,
  leading,
  onPick,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => options.filter((o) => matches(o, query)), [options, query]);
  const triggerText = display ?? value;

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <YStack gap={8} flex={1}>
      <FieldLabel label={label} />
      <XStack
        testID={`${testID}-trigger`}
        role="button"
        aria-label={label}
        aria-disabled={disabled}
        onPress={disabled ? undefined : () => setOpen(true)}
        alignItems="center"
        gap={8}
        height={FIELD_HEIGHT}
        paddingHorizontal={14}
        borderRadius={FIELD_RADIUS}
        borderWidth={1}
        borderColor={error ? '$danger' : '$borderColor'}
        backgroundColor="$surface"
        opacity={disabled ? 0.5 : 1}
        pressStyle={PRESS_STYLE.control}
      >
        {leading}
        <Text flex={1} fontSize={15} color={triggerText ? '$color' : '$muted'} numberOfLines={1}>
          {triggerText || placeholder}
        </Text>
        <MaterialIcons name="expand-more" size={22} color={muted} />
      </XStack>
      {error ? (
        <Text testID={`${testID}-error`} fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <ModalThemeScope>
          <KeyboardScreen>
            <YStack flex={1} alignItems="center" justifyContent="center" testID={`${testID}-sheet`}>
              <YStack
                pressStyle={PRESS_STYLE.surface}
                testID={`${testID}-sheet-backdrop`}
                role="button"
                aria-label={t('mweb.common.close')}
                onPress={close}
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                backgroundColor="rgba(0,0,0,0.5)"
              />
              <YStack
                width="92%"
                maxWidth={420}
                maxHeight="76%"
                backgroundColor="$surface"
                borderRadius={28}
                padding={20}
                gap={12}
              >
                <Text fontSize={18} fontWeight="600" color="$color">
                  {label}
                </Text>
                <XStack
                  alignItems="center"
                  gap={8}
                  height={48}
                  paddingHorizontal={16}
                  borderRadius={999}
                  backgroundColor="$soft"
                >
                  <MaterialIcons name="search" size={20} color={muted} />
                  <Input
                    testID={`${testID}-search`}
                    aria-label={t('mweb.common.search')}
                    flex={1}
                    unstyled
                    value={query}
                    onChangeText={setQuery}
                    placeholder={`Search ${label.toLowerCase()}`}
                    placeholderTextColor="$muted"
                    fontSize={15}
                    color="$color"
                  />
                </XStack>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <YStack>
                    {filtered.map((option) => (
                      <SelectOptionRow
                        key={option.value}
                        option={option}
                        active={option.value === value}
                        testID={`${testID}-option-${option.value}`}
                        onPress={() => {
                          onPick(option.value);
                          close();
                        }}
                      />
                    ))}
                    {filtered.length === 0 ? (
                      <Text
                        testID={`${testID}-empty`}
                        fontSize={14}
                        color="$muted"
                        paddingVertical={12}
                      >
                        No matches.
                      </Text>
                    ) : null}
                  </YStack>
                </ScrollView>
              </YStack>
            </YStack>
          </KeyboardScreen>
        </ModalThemeScope>
      </Modal>
    </YStack>
  );
}
