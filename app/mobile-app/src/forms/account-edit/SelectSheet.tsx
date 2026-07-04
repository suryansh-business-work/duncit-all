import { type ReactNode, useMemo, useState } from 'react';
import { Modal } from 'react-native';
import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Input, ScrollView, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';

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
 * (wrapped in <ModalThemeScope>). Tamagui has no native <select>; this mirrors
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
    <YStack gap={6} flex={1}>
      <Text fontSize={14} fontWeight="500" color="$color">
        {label}
      </Text>
      <XStack
        testID={`${testID}-trigger`}
        role="button"
        aria-label={label}
        aria-disabled={disabled}
        onPress={disabled ? undefined : () => setOpen(true)}
        alignItems="center"
        gap={8}
        height={48}
        paddingHorizontal={12}
        borderRadius={9}
        borderWidth={1}
        borderColor={error ? '$danger' : '$borderColor'}
        backgroundColor="$surface"
        opacity={disabled ? 0.5 : 1}
        pressStyle={{ opacity: 0.8 }}
      >
        {leading}
        <Text flex={1} fontSize={14} color={triggerText ? '$color' : '$muted'} numberOfLines={1}>
          {triggerText || placeholder}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={22} color={muted} />
      </XStack>
      {error ? (
        <Text testID={`${testID}-error`} fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <ModalThemeScope>
          <YStack flex={1} alignItems="center" justifyContent="center" testID={`${testID}-sheet`}>
            <YStack
              testID={`${testID}-sheet-backdrop`}
              role="button"
              aria-label="Close"
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
              backgroundColor="$background"
              borderRadius={20}
              padding={16}
              gap={12}
            >
              <Text fontSize={16} fontWeight="900" color="$color">
                {label}
              </Text>
              <XStack
                alignItems="center"
                gap={6}
                height={40}
                paddingHorizontal={10}
                borderRadius={10}
                borderWidth={1}
                borderColor="$borderColor"
                backgroundColor="$surface"
              >
                <MaterialIcons name="search" size={16} color={muted} />
                <Input
                  testID={`${testID}-search`}
                  flex={1}
                  unstyled
                  value={query}
                  onChangeText={setQuery}
                  placeholder={`Search ${label.toLowerCase()}`}
                  placeholderTextColor="$muted"
                  fontSize={14}
                  color="$color"
                />
              </XStack>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <YStack>
                  {filtered.map((option) => {
                    const active = option.value === value;
                    return (
                      <XStack
                        key={option.value}
                        testID={`${testID}-option-${option.value}`}
                        role="button"
                        aria-label={option.label}
                        aria-pressed={active}
                        onPress={() => {
                          onPick(option.value);
                          close();
                        }}
                        alignItems="center"
                        gap={10}
                        paddingVertical={11}
                        pressStyle={{ opacity: 0.7 }}
                      >
                        {option.flag ? (
                          <AppImage
                            source={{ uri: option.flag }}
                            style={{ width: 22, height: 16, borderRadius: 2 }}
                          />
                        ) : null}
                        <Text
                          flex={1}
                          fontSize={14}
                          fontWeight={active ? '800' : '500'}
                          color={active ? '$primary' : '$color'}
                        >
                          {option.label}
                        </Text>
                        {option.hint ? (
                          <Text fontSize={13} color="$muted">
                            {option.hint}
                          </Text>
                        ) : null}
                        {active ? <MaterialIcons name="check" size={18} color={muted} /> : null}
                      </XStack>
                    );
                  })}
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
        </ModalThemeScope>
      </Modal>
    </YStack>
  );
}
