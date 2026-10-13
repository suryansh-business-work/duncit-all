import { Text, XStack } from 'tamagui';
import { FOOD_ORDER_LIMITS } from '@duncit/utils';

import { StepButton } from '@/components/StepButton';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** The dish, for the buttons' names. */
  name: string;
  quantity: number;
  onChange: (quantity: number) => void;
  disabled?: boolean;
  testID: string;
}

/**
 * − quantity + for one dish. Taking the last one away removes the dish; the +
 * stops at the most of one dish an order may hold. Each button names the dish
 * it changes, and the count is announced as it moves. Tamagui twin of mWeb's
 * food/QuantityStepper.
 */
export function QuantityStepper({ name, quantity, onChange, disabled, testID }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <XStack
      testID={testID}
      role="group"
      aria-label={t('mweb.venueFood.quantityOf', { vars: { quantity: String(quantity), name } })}
      alignItems="center"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={999}
      backgroundColor="$surface"
    >
      <StepButton
        icon="remove"
        press="control"
        testID={`${testID}-decrease`}
        label={t('mweb.venueFood.decrease', { vars: { name } })}
        disabled={!!disabled}
        onPress={() => onChange(quantity - 1)}
      />
      <Text
        testID={`${testID}-value`}
        aria-live="polite"
        minWidth={24}
        textAlign="center"
        fontSize={14}
        fontWeight="700"
        color="$color"
      >
        {quantity}
      </Text>
      <StepButton
        icon="add"
        press="control"
        testID={`${testID}-increase`}
        label={t('mweb.venueFood.increase', { vars: { name } })}
        disabled={!!disabled || quantity >= FOOD_ORDER_LIMITS.maxQuantity}
        onPress={() => onChange(quantity + 1)}
      />
    </XStack>
  );
}
