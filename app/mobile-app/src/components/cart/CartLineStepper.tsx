import { XStack } from 'tamagui';

import { CartQuantityControl } from '@/components/cart/CartQuantityControl';
import { cartControlLabels } from '@/components/cart/cartControlLabels';
import { cartLineKey, type CartLine } from '@/stores/cart.store';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  line: CartLine;
  onSetQuantity: (line: CartLine, quantity: number) => void;
}

/** The cart line's quantity: the same remove · count · plus pill every product
 * card shows, stopping at the line's stock; taking the last unit away removes
 * the line. */
export function CartLineStepper({ line, onSetQuantity }: Readonly<Props>) {
  const { t } = useTranslation();
  const key = cartLineKey(line);
  return (
    <XStack marginTop={4}>
      <CartQuantityControl
        quantity={line.quantity}
        max={line.max_quantity}
        labels={cartControlLabels(t, line.product_name)}
        onChange={(next) => onSetQuantity(line, next)}
        testIdPrefix={`cart-stepper-${key}`}
        testIds={{ decrease: `cart-minus-${key}`, increase: `cart-plus-${key}` }}
      />
    </XStack>
  );
}
