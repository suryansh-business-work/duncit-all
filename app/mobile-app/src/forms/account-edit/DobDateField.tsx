import { useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { format, parseISO } from 'date-fns';
import { DEFAULT_MIN_ACCOUNT_AGE_YEARS, latestEligibleDob } from '@duncit/datetime';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { DobCalendarSheet } from './DobCalendarSheet';

const DOB_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Parse a typed YYYY-MM-DD value into a Date, or null when blank/invalid. */
export function parseDob(value: string): Date | null {
  if (!DOB_PATTERN.test(value)) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

interface DobDateFieldProps<T extends FieldValues> {
  control: Control<T>;
  /** Defaults to the conventional `dob` field both forms declare. */
  name?: Path<T>;
  /** Admin-configured minimum joining age (Admin > Settings). */
  minAge?: number;
}

/**
 * Full date-of-birth picker (bug 1) — type `YYYY-MM-DD` directly or open the
 * calendar sheet, which offers fast editable year selection then month + day.
 * The calendar stops at the minimum joining age and the range is capped at ~120
 * years. RN twin of mWeb's MUI X DobDateField; the value is stored as a
 * 'YYYY-MM-DD' string.
 *
 * Generic over the form so signup and edit-profile share ONE picker — they ask
 * for the same thing and must enforce the same age.
 */
export function DobDateField<T extends FieldValues>({
  control,
  name,
  minAge = DEFAULT_MIN_ACCOUNT_AGE_YEARS,
}: Readonly<DobDateFieldProps<T>>) {
  const { color: ink, muted } = useThemeColors();
  const { t } = useTranslation();
  const { field, fieldState } = useController({ control, name: name ?? ('dob' as Path<T>) });
  const [open, setOpen] = useState(false);
  const closeSheet = () => setOpen(false);

  const value = typeof field.value === 'string' ? field.value : '';
  /* Signup validates on blur, which left a TYPED birthday silent until focus
     moved on, while one picked from the sheet flagged straight away — closing
     the sheet blurs the input. A complete date is checked the moment it is
     typed; partial input still waits, so the format hint does not fire on
     every keystroke. */
  const onTyped = (text: string) => {
    field.onChange(text);
    if (DOB_PATTERN.test(text)) field.onBlur();
  };
  // The calendar stops at the minimum joining age, so an under-18 day cannot be
  // picked; the schema still re-checks a typed value.
  const maxDate = latestEligibleDob(minAge);
  const error = fieldState.error?.message;

  return (
    <YStack gap={6}>
      <Text fontSize={14} fontWeight="500" color="$color">
        {t('mweb.auth.dateOfBirth')}
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
          onChangeText={onTyped}
          onBlur={field.onBlur}
          placeholder={t('mweb.signup.dobPlaceholder')}
          autoCapitalize="none"
          aria-label={t('mweb.auth.dateOfBirth')}
        />
        <XStack
          testID="dob-open"
          role="button"
          aria-label={t('mweb.signup.dobPick')}
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
          <KeyboardScreen>
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
                      field.onBlur();
                      setOpen(false);
                    }}
                  />
                </ScrollView>
              </YStack>
            </YStack>
          </KeyboardScreen>
        </ModalThemeScope>
      </Modal>
    </YStack>
  );
}
