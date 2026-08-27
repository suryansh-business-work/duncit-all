import { useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { format } from 'date-fns';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { FieldLabel } from '@/components/Field';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { parseDateTimeText } from './create-pod.form';
import { CalendarSheet } from './DateTimeSheet';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  label: string;
  value: string;
  onChange: (text: string) => void;
  /** Earliest pickable moment — the calendar sheet blocks anything before it. */
  minDateTime?: Date | null;
  error?: string;
  required?: boolean;
  testID: string;
}

/**
 * Tamagui date+time field — type the schedule directly or open the calendar/time
 * sheet. Both halves speak the admin-panel date and time patterns (rule 11),
 * mirroring what mWeb's MUI X DateTimePicker asks for on the same step; the
 * echo below normalises what was typed, so "5 jan 2026 7:00 pm" confirms back
 * as "05 Jan 2026 07:00 PM".
 */
export function DateTimeField({
  label,
  value,
  onChange,
  minDateTime = null,
  error,
  required,
  testID,
}: Readonly<Props>) {
  const { color: ink, muted } = useThemeColors();
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const [open, setOpen] = useState(false);
  const closeSheet = () => setOpen(false);
  const parsed = parseDateTimeText(value);

  return (
    <YStack gap={6}>
      <FieldLabel label={label} required={required} testID={testID} />
      <XStack gap={8} alignItems="center">
        <Input
          testID={`field-${testID}`}
          flex={1}
          size="$4"
          backgroundColor="$surface"
          color="$color"
          placeholderTextColor="$muted"
          borderColor={error ? '$danger' : '$borderColor'}
          value={value}
          onChangeText={onChange}
          placeholder={t('mweb.createPod.dateTimePlaceholder', {
            vars: { format: fmt.dateTimePlaceholder },
          })}
          aria-label={label}
        />
        <XStack
          testID={`${testID}-open`}
          role="button"
          aria-label={t('mweb.createPod.pickDateTime', { vars: { label } })}
          onPress={() => setOpen(true)}
          width={44}
          height={44}
          alignItems="center"
          justifyContent="center"
          borderRadius={10}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
          pressStyle={PRESS_STYLE.row}
        >
          <MaterialIcons name="event" size={20} color={ink} />
        </XStack>
      </XStack>
      {parsed ? (
        <Text testID={`${testID}-formatted`} fontSize={12} color="$muted">
          {format(parsed, fmt.dateTimeInputFormat)}
        </Text>
      ) : null}
      {error ? (
        <Text testID={`${testID}-error`} fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={closeSheet}>
        <ModalThemeScope>
          <YStack flex={1} alignItems="center" justifyContent="center" testID={`${testID}-sheet`}>
            <YStack
              pressStyle={PRESS_STYLE.surface}
              testID={`${testID}-sheet-backdrop`}
              role="button"
              aria-label={t('mweb.auth.close')}
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
                <CalendarSheet
                  testID={testID}
                  initial={parsed}
                  minDateTime={minDateTime}
                  muted={muted}
                  onDone={(picked) => {
                    onChange(format(picked, fmt.dateTimeInputFormat));
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
