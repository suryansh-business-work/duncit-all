import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { FreeDeliveryBadge } from '@/components/cart/FreeDeliveryBadge';
import { lineQualifiesFreeDelivery } from '@/services/cart';
import { cartLineKey, type CartLine } from '@/stores/cart.store';
import { useThemeColors } from '@/hooks/useThemeColors';

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

/** The per-line − qty + stepper. */
function LineStepper({ line, onSetQuantity }: Readonly<StepperProps>) {
  const { muted } = useThemeColors();
  const atMax = line.quantity >= line.max_quantity;
  return (
    <XStack gap={6} alignItems="center">
      <XStack
        testID={`cart-minus-${cartLineKey(line)}`}
        role="button"
        aria-label={`Decrease ${line.product_name}`}
        onPress={() => onSetQuantity(line, line.quantity - 1)}
        width={30}
        height={30}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        pressStyle={{ opacity: 0.7 }}
      >
        <MaterialIcons name="remove" size={18} color={muted} />
      </XStack>
      <Text fontSize={14} fontWeight="900" color="$color">
        {line.quantity}
      </Text>
      <XStack
        testID={`cart-plus-${cartLineKey(line)}`}
        role="button"
        aria-label={`Increase ${line.product_name}`}
        aria-disabled={atMax}
        onPress={atMax ? undefined : () => onSetQuantity(line, line.quantity + 1)}
        width={30}
        height={30}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        opacity={atMax ? 0.4 : 1}
        pressStyle={{ opacity: 0.7 }}
      >
        <MaterialIcons name="add" size={18} color={muted} />
      </XStack>
    </XStack>
  );
}

/** One pod's cart lines: per-line +/- and remove, plus the group's products
 * total. Checkout is cart-wide (one payment) from the cart screen's single CTA.
 * RN twin of mWeb's CartPodGroup. */
export function CartPodGroup({ podId, podTitle, lines, onSetQuantity, onRemove }: Readonly<Props>) {
  const { muted } = useThemeColors();
  const total = lines.reduce((sum, line) => sum + line.unit_cost * line.quantity, 0);
  return (
    <YStack
      testID={`cart-pod-${podId}`}
      padding={14}
      gap={10}
      borderRadius={18}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$background"
    >
      <Text fontSize={15} fontWeight="900" color="$color" numberOfLines={1}>
        {podTitle}
      </Text>
      {lines.map((line) => (
        <XStack key={cartLineKey(line)} gap={10} alignItems="center">
          <YStack
            width={44}
            height={44}
            borderRadius={10}
            overflow="hidden"
            backgroundColor="$surface"
          >
            {line.image_url ? (
              <AppImage
                source={{ uri: line.image_url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : null}
          </YStack>
          <YStack flex={1} minWidth={0} gap={2}>
            <Text fontSize={13.5} fontWeight="800" color="$color" numberOfLines={1}>
              {line.product_name}
              {line.variant_label ? ` — ${line.variant_label}` : ''}
            </Text>
            <Text fontSize={11.5} color="$muted">
              ₹{line.unit_cost} each
            </Text>
            {lineQualifiesFreeDelivery(line) ? (
              <FreeDeliveryBadge testID={`cart-free-delivery-${cartLineKey(line)}`} />
            ) : null}
          </YStack>
          <LineStepper line={line} onSetQuantity={onSetQuantity} />
          <XStack
            testID={`cart-remove-${cartLineKey(line)}`}
            role="button"
            aria-label={`Remove ${line.product_name}`}
            onPress={() => onRemove(line)}
            padding={4}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="delete-outline" size={20} color={muted} />
          </XStack>
        </XStack>
      ))}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize={12} color="$muted">
          Products total
        </Text>
        <Text fontSize={15} fontWeight="900" color="$color">
          ₹{total}
        </Text>
      </XStack>
    </YStack>
  );
}
