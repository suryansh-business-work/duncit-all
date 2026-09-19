import { useFieldArray, type Control } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import type { ForceMarkValues } from '@duncit/forms/schemas';
import type { PodAttendanceLabels } from '@duncit/utils';

import { FormTextField } from '@/components/FormTextField';

interface Props {
  control: Control<ForceMarkValues>;
  labels: PodAttendanceLabels;
  seats: number;
}

/**
 * The rest of a multi-seat booking, as far as the admin was told — the Tamagui
 * twin of the shared MUI `ForceCompanionFields` (rule 27).
 *
 * The host collects these at the door, where the group is standing in front of
 * them and a phone number is reasonable to ask for. An admin is collecting them
 * from a phone call about a pod that already happened, so the number is
 * optional and a blank row is allowed — the mark goes through either way. The
 * rules behind that live once, in `@duncit/forms/schemas`, so this form and
 * mWeb's cannot start refusing different input with different sentences.
 */
export function ForceCompanionFields({ control, labels, seats }: Readonly<Props>) {
  // `fields` carries a stable id per row, which is what the key needs — these
  // rows have no id of their own until somebody types a name into them.
  const { fields } = useFieldArray({ control, name: 'companions' });
  if (fields.length === 0) return null;

  return (
    <YStack gap={12}>
      <YStack height={1} backgroundColor="$borderColor" />
      <YStack gap={2}>
        <Text fontSize={14} fontWeight="600" color="$color">
          {labels.forceCompanionsTitle}
        </Text>
        <Text fontSize={12.5} color="$muted">
          {labels.forceCompanionsBody(seats, fields.length)}
        </Text>
      </YStack>

      {fields.map((field, index) => (
        <YStack key={field.id} gap={8} testID={`force-companion-${index}`}>
          <FormTextField
            control={control}
            name={`companions.${index}.name`}
            label={labels.forceCompanionName}
          />
          <XStack gap={8}>
            <YStack width={112}>
              <FormTextField
                control={control}
                name={`companions.${index}.phone_extension`}
                label={labels.otpExtension}
                keyboardType="phone-pad"
              />
            </YStack>
            <YStack flex={1}>
              <FormTextField
                control={control}
                name={`companions.${index}.phone_number`}
                label={labels.forceCompanionPhone}
                keyboardType="phone-pad"
              />
            </YStack>
          </XStack>
        </YStack>
      ))}
    </YStack>
  );
}
