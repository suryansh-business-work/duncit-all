import { useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { format } from 'date-fns';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { FieldLabel } from '@/components/Field';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useThemeColors } from '@/hooks/useThemeColors';
import { parseDateTimeText } from './create-pod.form';
import { CalendarSheet } from './DateTimeSheet';

interface Props {
  label: string;
  value: string;
  onChange: (text: string) => void;
  error?: string;
  required?: boolean;
  testID: string;
}

/**
 * Tamagui date+time field — type `YYYY-MM-DD HH:mm` directly or open the
 * calendar/time sheet. The picked value is echoed below in the admin-panel
 * display format (rule 11), mirroring mWeb's MUI X DateTimePicker.
 */
export function DateTimeField({
  label,
  value,
  onChange,
  error,
  required,
  testID,
}: Readonly<Props>) {
  const { color: ink, muted } = useThemeColors();
  const { dateFormat, timeFormat } = useAppSettings();
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
          placeholder="YYYY-MM-DD HH:mm"
          aria-label={label}
        />
        <XStack
          testID={`${testID}-open`}
          role="button"
          aria-label={`Pick ${label}`}
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
      {parsed ? (
        <Text testID={`${testID}-formatted`} fontSize={12} color="$muted">
          {format(parsed, `${dateFormat} ${timeFormat}`)}
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
              testID={`${testID}-sheet-backdrop`}
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
                <CalendarSheet
                  testID={testID}
                  initial={parsed}
                  muted={muted}
                  onDone={(picked) => {
                    onChange(format(picked, 'yyyy-MM-dd HH:mm'));
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
