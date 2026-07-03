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

/** Free / Paid selector cards for Step 4. Selecting a card sets the free/paid
 * family default; the exact pod type stays refinable below. mWeb twin. */
export function PodTypeCards({ form }: Readonly<{ form: CreatePodForm }>) {
  const isFree = form.watch('pod_type').includes('FREE');

  const choose = (free: boolean) => {
    if (free === isFree) return;
    if (free) {
      form.setValue('pod_type', 'NATIVE_FREE', { shouldDirty: true });
      form.setValue('pod_amount_text', '0', { shouldDirty: true, shouldValidate: true });
    } else {
      form.setValue('pod_type', 'NATIVE_PAID', { shouldDirty: true, shouldValidate: true });
    }
  };

  return (
    <XStack gap={12}>
      <TypeCard
        testID="create-pod-free"
        label="Free"
        caption="No ticket charge"
        icon="volunteer-activism"
        selected={isFree}
        onPress={() => choose(true)}
      />
      <TypeCard
        testID="create-pod-paid"
        label="Paid"
        caption="Charge per person"
        icon="payments"
        selected={!isFree}
        onPress={() => choose(false)}
      />
    </XStack>
  );
}
