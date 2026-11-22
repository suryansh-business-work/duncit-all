import { useController, type Control } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import {
  PAYMENT_EVIDENCE_LABEL_KEYS,
  PAYMENT_EVIDENCE_TYPES,
  type PaymentClaimValues,
} from '@duncit/forms/schemas';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  control: Control<PaymentClaimValues>;
  /** Runs after the buyer picks a different option, so stale evidence is dropped. */
  onSwitch: () => void;
}

/** The three ways to show a deduction, as radio rows. Twin of mWeb's EvidenceOptions. */
export function EvidenceOptions({ control, onSwitch }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted, primary } = useThemeColors();
  const { field } = useController({ control, name: 'evidence_type' });
  const groupLabel = t('mweb.payment.claim.optionsLabel');

  return (
    <YStack gap={8}>
      <Text fontSize={14} fontWeight="600" color="$color">
        {groupLabel}
      </Text>
      <YStack gap={8} role="radiogroup" aria-label={groupLabel}>
        {PAYMENT_EVIDENCE_TYPES.map((type) => {
          const checked = field.value === type;
          const label = t(PAYMENT_EVIDENCE_LABEL_KEYS[type]);
          return (
            <XStack
              key={type}
              testID={`payment-claim-option-${type}`}
              role="radio"
              aria-checked={checked}
              aria-label={label}
              tabIndex={0}
              onPress={() => {
                if (checked) return;
                field.onChange(type);
                onSwitch();
              }}
              alignItems="center"
              gap={10}
              padding={12}
              borderRadius={14}
              borderWidth={1}
              borderColor={checked ? primary : '$borderColor'}
              backgroundColor={checked ? '$soft' : '$surface'}
              pressStyle={PRESS_STYLE.control}
            >
              <MaterialIcons
                name={checked ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={18}
                color={checked ? primary : muted}
              />
              <Text flex={1} fontSize={14} color="$color">
                {label}
              </Text>
            </XStack>
          );
        })}
      </YStack>
    </YStack>
  );
}
