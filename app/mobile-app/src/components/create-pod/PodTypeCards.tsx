import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { CreatePodForm } from './create-pod.types';
import { PRESS_STYLE } from '@duncit/buttons-native';

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
  const { onPrimary, color } = useThemeColors();
  const ink = selected ? '$onPrimary' : '$color';
  return (
    <YStack
      testID={testID}
      tabIndex={0}
      role="radio"
      aria-label={label}
      aria-checked={selected}
      onPress={onPress}
      flex={1}
      padding={16}
      gap={4}
      borderRadius={16}
      backgroundColor={selected ? '$primary' : '$soft'}
      alignItems="center"
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name={icon} size={24} color={selected ? onPrimary : color} />
      <Text fontSize={16} fontWeight="600" color={ink}>
        {label}
      </Text>
      <Text fontSize={12} color={selected ? '$onPrimary' : '$muted'} textAlign="center">
        {caption}
      </Text>
    </YStack>
  );
}

/** Free / Paid selector cards for Step 4 — the pod-type selector, both cards
 * offered to a physical and a virtual pod. mWeb twin. */
export function PodTypeCards({ form }: Readonly<{ form: CreatePodForm }>) {
  const { t } = useTranslation();
  const isFree = form.watch('pod_type') === 'FREE';
  const typeError = form.formState.errors.pod_type?.message;

  const choose = (free: boolean) => {
    if (free === isFree) return;
    if (free) {
      form.setValue('pod_type', 'FREE', { shouldDirty: true });
      form.setValue('pod_amount_text', '0', { shouldDirty: true, shouldValidate: true });
      // A free pod never carries a multi-ticket discount or a Smart Incentive.
      form.setValue('ticket_discount_enabled', false, { shouldDirty: true });
      form.setValue('ticket_discount_tiers', [], { shouldDirty: true });
      form.setValue('smart_incentive_enabled', false, { shouldDirty: true });
      form.setValue('smart_incentive_pct', '', { shouldDirty: true });
    } else {
      form.setValue('pod_type', 'PAID', { shouldDirty: true, shouldValidate: true });
      // The ₹0 a Free pod forces was never typed by the host — a paid pod goes
      // back to a blank price field.
      form.setValue('pod_amount_text', '', { shouldDirty: true, shouldValidate: true });
    }
  };

  return (
    <YStack gap={6}>
      <XStack gap={12} role="radiogroup">
        <TypeCard
          testID="create-pod-free"
          label={t('mweb.createPod.podTypeFree')}
          caption={t('mweb.createPod.freeCaption')}
          icon="volunteer-activism"
          selected={isFree}
          onPress={() => choose(true)}
        />
        <TypeCard
          testID="create-pod-paid"
          label={t('mweb.createPod.podTypePaid')}
          caption={t('mweb.createPod.paidCaption')}
          icon="payments"
          selected={!isFree}
          onPress={() => choose(false)}
        />
      </XStack>
      {typeError ? (
        <Text role="alert" testID="pod_type-error" fontSize={12} color="$danger">
          {typeError}
        </Text>
      ) : null}
    </YStack>
  );
}
