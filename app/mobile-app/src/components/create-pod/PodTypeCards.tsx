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
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name={icon} size={24} color={selected ? primary : color} />
      <Text fontSize={16} fontWeight="700" color={selected ? '$primary' : '$color'}>
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
  const { t } = useTranslation();
  const isFree = form.watch('pod_type') === 'FREE';
  const isPhysical = form.watch('pod_mode') === 'PHYSICAL';
  const typeError = form.formState.errors.pod_type?.message;
  const paidCaption = isPhysical
    ? t('mweb.createPod.physicalPaidCaption')
    : t('mweb.createPod.paidCaption');

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
            label={t('mweb.createPod.podTypeFree')}
            caption={t('mweb.createPod.freeCaption')}
            icon="volunteer-activism"
            selected={isFree}
            onPress={() => choose(true)}
          />
        )}
        <TypeCard
          testID="create-pod-paid"
          label={t('mweb.createPod.podTypePaid')}
          caption={paidCaption}
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
