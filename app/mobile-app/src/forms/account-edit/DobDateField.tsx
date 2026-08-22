import { useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import {
  DEFAULT_MIN_ACCOUNT_AGE_YEARS,
  isIsoDay,
  latestEligibleDob,
  parseIsoDay,
} from '@duncit/datetime';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { DobCalendarSheet } from './DobCalendarSheet';

/** Parse a stored 'YYYY-MM-DD' value into a Date, or null when blank/invalid. */
export const parseDob = parseIsoDay;

interface DobDateFieldProps<T extends FieldValues> {
  control: Control<T>;
  /** Defaults to the conventional `dob` field both forms declare. */
  name?: Path<T>;
  /** Admin-configured minimum joining age (Admin > Settings). */
  minAge?: number;
}

/**
 * Full date-of-birth picker — type the date directly or open the calendar
 * sheet, which offers fast editable year selection then month + day. The
 * calendar stops at the minimum joining age and the range is capped at ~120
 * years.
 *
 * What is TYPED and shown is the admin's configured date pattern (rule 11),
 * matching the MUI X field mWeb renders for the same question; what is STORED
 * stays 'YYYY-MM-DD', which is what the schema and the API speak. The box used
 * to demand YYYY-MM-DD from the member while mWeb asked the same person for
 * MM/DD/YYYY and the admin panel displayed dd MMM yyyy.
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
  const fmt = useDateFormat();
  const { field, fieldState } = useController({ control, name: name ?? ('dob' as Path<T>) });
  const [open, setOpen] = useState(false);
  const closeSheet = () => setOpen(false);

  const stored = typeof field.value === 'string' ? field.value : '';
  /* A complete birthday is held as 'YYYY-MM-DD' and read back in the admin's
     pattern; anything else is half-typed text, echoed exactly as entered so
     backspacing works. Both render identically once a date is complete, so
     there is no flicker as the value converts. */
  const value = isIsoDay(stored) ? fmt.formatDay(stored) : stored;
  /* Signup validates on blur, which left a TYPED birthday silent until focus
     moved on, while one picked from the sheet flagged straight away — closing
     the sheet blurs the input. A complete date is checked the moment it is
     typed; partial input still waits, so the format hint does not fire on
     every keystroke. */
  const onTyped = (text: string) => {
    const parsed = fmt.parseDate(text);
    field.onChange(parsed ? fmt.toIsoDay(parsed) : text);
    if (parsed) field.onBlur();
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
          placeholder={t('mweb.signup.dobPlaceholder', { vars: { format: fmt.datePlaceholder } })}
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
                aria-label={t('mweb.common.close')}
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
                    initial={parseDob(stored)}
                    muted={muted}
                    maxDate={maxDate}
                    onDone={(picked) => {
                      field.onChange(fmt.toIsoDay(picked));
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
