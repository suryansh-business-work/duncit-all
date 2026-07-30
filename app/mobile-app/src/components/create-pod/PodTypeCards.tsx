import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { CreatePodForm } from './create-pod.types';

type IconName = keyof typeof MaterialIcons.glyphMap;

interface CardProps {
  testID: string;
  label: string;
  caption: string;
  icon: IconName;
  selected: boolean;
  onPress: () => void;
}

function TypeCard({ testID, label, caption, icon, selected, onPress }: Readonly<CardProps>) {
  const { primary, color } = useThemeColors();
  return (
    <YStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-pressed={selected}
      onPress={onPress}
      flex={1}
      padding={16}
      gap={4}
      borderRadius={14}
      borderWidth={selected ? 2 : 1}
      borderColor={selected ? '$primary' : '$borderColor'}
      backgroundColor="$surface"
      alignItems="center"
      pressStyle={{ opacity: 0.85 }}
    >
      <MaterialIcons name={icon} size={24} color={selected ? primary : color} />
      <Text fontSize={16} fontWeight="900" color={selected ? '$primary' : '$color'}>
        {label}
      </Text>
      <Text fontSize={11.5} color="$muted">
        {caption}
      </Text>
    </YStack>
  );
}

/** Free / Paid selector cards for Step 4 — the pod-type selector. FREE is
 * virtual-only, so physical pods only see the Paid card. mWeb twin. */
export function PodTypeCards({ form }: Readonly<{ form: CreatePodForm }>) {
  const isFree = form.watch('pod_type') === 'FREE';
  const isPhysical = form.watch('pod_mode') === 'PHYSICAL';
  const typeError = form.formState.errors.pod_type?.message;

  const choose = (free: boolean) => {
    if (free === isFree) return;
    if (free) {
      form.setValue('pod_type', 'FREE', { shouldDirty: true });
      form.setValue('pod_amount_text', '0', { shouldDirty: true, shouldValidate: true });
    } else {
      form.setValue('pod_type', 'PAID', { shouldDirty: true, shouldValidate: true });
      // The ₹0 a Free pod forces was never typed by the host — a paid pod goes
      // back to a blank price field.
      form.setValue('pod_amount_text', '', { shouldDirty: true, shouldValidate: true });
    }
  };

  return (
    <YStack gap={6}>
      <XStack gap={12}>
        {isPhysical ? null : (
          <TypeCard
            testID="create-pod-free"
            label="Free" // TODO(i18n)
            caption="No ticket charge" // TODO(i18n)
            icon="volunteer-activism"
            selected={isFree}
            onPress={() => choose(true)}
          />
        )}
        <TypeCard
          testID="create-pod-paid"
          label="Paid" // TODO(i18n)
          caption={isPhysical ? 'Physical pods are always paid' : 'Charge per person'} // TODO(i18n)
          icon="payments"
          selected={!isFree}
          onPress={() => choose(false)}
        />
      </XStack>
      {typeError ? (
        <Text testID="pod_type-error" fontSize={12} color="$danger">
          {typeError}
        </Text>
      ) : null}
    </YStack>
  );
}
