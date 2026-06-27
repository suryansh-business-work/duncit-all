import { useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { useController, type Control } from 'react-hook-form';
import { format } from 'date-fns';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { DobCalendarSheet } from './DobCalendarSheet';
import type { AccountEditValues } from './account-edit.types';

const DOB_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Parse a typed YYYY-MM-DD value into a Date, or null when blank/invalid. */
export function parseDob(value: string): Date | null {
  if (!DOB_PATTERN.test(value)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Full date-of-birth picker (bug 1) — type `YYYY-MM-DD` directly or open the
 * calendar sheet, which offers fast editable year selection then month + day.
 * Future dates are blocked and the range is capped at ~120 years. RN twin of
 * mWeb's MUI X DobDateField; the value is stored as a 'YYYY-MM-DD' string.
 */
export function DobDateField({ control }: Readonly<{ control: Control<AccountEditValues> }>) {
  const { color: ink, muted } = useThemeColors();
  const { field, fieldState } = useController({ control, name: 'dob' });
  const [open, setOpen] = useState(false);
  const closeSheet = () => setOpen(false);

  const value = field.value ?? '';
  const maxDate = new Date();
  const error = fieldState.error?.message;

  return (
    <YStack gap={6}>
      <Text fontSize={14} fontWeight="500" color="$color">
        Date of birth
      </Text>
      <XStack gap={8} alignItems="center">
        <Input
          testID="field-dob"
          flex={1}
          size="$4"
          backgroundColor="$surface"
          color="$color"
          placeholderTextColor="$muted"
          borderColor={error ? '$danger' : '$borderColor'}
          value={value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          aria-label="Date of birth"
        />
        <XStack
          testID="dob-open"
          role="button"
          aria-label="Pick date of birth"
          onPress={() => setOpen(true)}
          width={44}
          height={44}
          alignItems="center"
          justifyContent="center"
          borderRadius={10}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
          pressStyle={{ opacity: 0.7 }}
        >
          <MaterialIcons name="event" size={20} color={ink} />
        </XStack>
      </XStack>
      {error ? (
        <Text testID="dob-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={closeSheet}>
        <ModalThemeScope>
          <YStack flex={1} alignItems="center" justifyContent="center" testID="dob-sheet">
            <YStack
              testID="dob-sheet-backdrop"
              role="button"
              aria-label="Close"
              onPress={closeSheet}
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
              maxHeight="86%"
              backgroundColor="$background"
              borderRadius={20}
              padding={16}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <DobCalendarSheet
                  testID="dob"
                  initial={parseDob(value)}
                  muted={muted}
                  maxDate={maxDate}
                  onDone={(picked) => {
                    field.onChange(format(picked, 'yyyy-MM-dd'));
                    setOpen(false);
                  }}
                />
              </ScrollView>
            </YStack>
          </YStack>
        </ModalThemeScope>
      </Modal>
    </YStack>
  );
}
