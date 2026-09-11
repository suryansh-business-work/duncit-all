import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { FreeDeliveryBadge } from '@/components/cart/FreeDeliveryBadge';
import { SurfaceCard } from '@/components/SurfaceCard';
import { lineQualifiesFreeDelivery } from '@/services/cart';
import { cartLineKey, type CartLine } from '@/stores/cart.store';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  podId: string;
  podTitle: string;
  lines: CartLine[];
  onSetQuantity: (line: CartLine, quantity: number) => void;
  onRemove: (line: CartLine) => void;
}

interface StepperProps {
  line: CartLine;
  onSetQuantity: (line: CartLine, quantity: number) => void;
}

interface LineProps extends StepperProps {
  /** Rows after the first carry the hairline divider above them. */
  divided: boolean;
  onRemove: (line: CartLine) => void;
}

const THUMB_STYLE = { width: '100%', height: '100%' } as const;

/** The per-line − qty + stepper: a soft pill holding two round buttons. */
function LineStepper({ line, onSetQuantity }: Readonly<StepperProps>) {
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
        aria-label={t('mweb.cart.decrease', { vars: { name: line.product_name } })}
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
        aria-label={t('mweb.cart.increase', { vars: { name: line.product_name } })}
        aria-disabled={atMax}
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

/** One cart line: 64px thumb, name, unit price (+ free-delivery pill), the
 * stepper, and a round remove button. */
function CartLineRow({ line, divided, onSetQuantity, onRemove }: Readonly<LineProps>) {
  const { muted } = useThemeColors();
  const { t } = useTranslation();
  return (
    <XStack
      gap={12}
      alignItems="flex-start"
      paddingVertical={12}
      borderTopWidth={divided ? 1 : 0}
      borderColor="$borderColor"
    >
      <YStack width={64} height={64} borderRadius={12} overflow="hidden" backgroundColor="$soft">
        {line.image_url ? (
          <AppImage source={{ uri: line.image_url }} style={THUMB_STYLE} resizeMode="cover" />
        ) : null}
      </YStack>
      <YStack flex={1} minWidth={0} gap={4}>
        <Text fontSize={14} fontWeight="600" color="$color" numberOfLines={2} lineHeight={18}>
          {line.product_name}
          {line.variant_label ? ` — ${line.variant_label}` : ''}
        </Text>
        <XStack gap={6} alignItems="center" flexWrap="wrap">
          <Text fontSize={12} color="$muted">
            {t('mweb.cart.unitEach', { vars: { price: `₹${line.unit_cost}` } })}
          </Text>
          {lineQualifiesFreeDelivery(line) ? (
            <FreeDeliveryBadge testID={`cart-free-delivery-${cartLineKey(line)}`} />
          ) : null}
        </XStack>
        <LineStepper line={line} onSetQuantity={onSetQuantity} />
      </YStack>
      <XStack
        testID={`cart-remove-${cartLineKey(line)}`}
        role="button"
        aria-label={t('mweb.cart.removeItem', { vars: { name: line.product_name } })}
        onPress={() => onRemove(line)}
        width={36}
        height={36}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        backgroundColor="$soft"
        pressStyle={PRESS_STYLE.control}
      >
        <MaterialIcons name="delete-outline" size={20} color={muted} />
      </XStack>
    </XStack>
  );
}

/** One pod's cart lines as rows inside one card, plus the group's products
 * total. Checkout is cart-wide (one payment) from the cart screen's single CTA.
 * RN twin of mWeb's CartPodGroup. */
export function CartPodGroup({ podId, podTitle, lines, onSetQuantity, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const total = lines.reduce((sum, line) => sum + line.unit_cost * line.quantity, 0);
  return (
    <SurfaceCard testID={`cart-pod-${podId}`} paddingBottom={12}>
      <Text fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
        {podTitle}
      </Text>
      {lines.map((line, lineIndex) => (
        <CartLineRow
          key={cartLineKey(line)}
          line={line}
          divided={lineIndex > 0}
          onSetQuantity={onSetQuantity}
          onRemove={onRemove}
        />
      ))}
      <XStack
        justifyContent="space-between"
        alignItems="center"
        paddingTop={12}
        borderTopWidth={1}
        borderColor="$borderColor"
      >
        <Text fontSize={13} color="$muted">
          {t('mweb.cart.productsTotal')}
        </Text>
        <Text fontSize={15} fontWeight="600" color="$color">
          ₹{total}
        </Text>
      </XStack>
    </SurfaceCard>
  );
}
