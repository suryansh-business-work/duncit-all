import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { cartLineKey, type CartLine } from '@/stores/cart.store';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  line: CartLine;
  onSetQuantity: (line: CartLine, quantity: number) => void;
}

/** The per-line − qty + stepper: a soft pill holding two round buttons. */
export function CartLineStepper({ line, onSetQuantity }: Readonly<Props>) {
  const { color: ink } = useThemeColors();
  const { t } = useTranslation();
  const atMax = line.quantity >= line.max_quantity;
  return (
    <XStack
      gap={8}
      alignItems="center"
      alignSelf="flex-start"
      padding={4}
      marginTop={4}
      borderRadius={999}
      backgroundColor="$soft"
    >
      <XStack
        testID={`cart-minus-${cartLineKey(line)}`}
        role="button"
        tabIndex={0}
        aria-label={t('mweb.cart.decrease', { vars: { name: line.product_name } })}
        hitSlop={6}
        onPress={() => onSetQuantity(line, line.quantity - 1)}
        width={32}
        height={32}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        backgroundColor="$surface"
        pressStyle={PRESS_STYLE.control}
      >
        <MaterialIcons name="remove" size={18} color={ink} />
      </XStack>
      <Text minWidth={20} textAlign="center" fontSize={14} fontWeight="600" color="$color">
        {line.quantity}
      </Text>
      <XStack
        testID={`cart-plus-${cartLineKey(line)}`}
        role="button"
        tabIndex={0}
        aria-label={t('mweb.cart.increase', { vars: { name: line.product_name } })}
        aria-disabled={atMax}
        hitSlop={6}
        onPress={atMax ? undefined : () => onSetQuantity(line, line.quantity + 1)}
        width={32}
        height={32}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        backgroundColor="$surface"
        opacity={atMax ? 0.4 : 1}
        pressStyle={PRESS_STYLE.control}
      >
        <MaterialIcons name="add" size={18} color={ink} />
      </XStack>
    </XStack>
  );
}
