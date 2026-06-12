import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { ChipSelectField } from './ChipSelectField';
import type { CreatePodProduct, PodProductRequest } from './create-pod.types';

interface Props {
  value: PodProductRequest[];
  onChange: (next: PodProductRequest[]) => void;
  products: CreatePodProduct[];
  error?: string;
}

export function productRequestTotal(requests: PodProductRequest[], products: CreatePodProduct[]) {
  const byId = new Map(products.map((product) => [product.id, product]));
  return requests.reduce(
    (sum, item) => sum + (byId.get(item.product_id)?.unit_cost ?? 0) * (item.quantity || 0),
    0,
  );
}

const stepperBox = {
  width: 34,
  height: 34,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '$borderColor',
  pressStyle: { opacity: 0.7 },
} as const;

/** Editable list of Duncit product requests (product + quantity) for a pod. */
export function ProductRequestsField({ value, onChange, products, error }: Readonly<Props>) {
  const { color, primary, danger } = useThemeColors();
  const update = (idx: number, patch: Partial<PodProductRequest>) =>
    onChange(value.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  const add = () => onChange([...value, { product_id: '', quantity: 1 }]);
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
  const options = products.map((product) => ({
    value: product.id,
    label: `${product.product_name} (₹${product.unit_cost}, ${product.available_count} left)`,
  }));

  return (
    <YStack gap={12}>
      {value.map((row, idx) => (
        <YStack
          key={idx}
          gap={8}
          padding={10}
          borderRadius={10}
          borderWidth={1}
          borderColor="$borderColor"
        >
          <ChipSelectField
            label="Product"
            options={options}
            value={row.product_id}
            onChange={(id) => update(idx, { product_id: id })}
            emptyHint="No products available."
            testID={`product-${idx}`}
          />
          <XStack alignItems="center" gap={10}>
            <Text fontSize={13} color="$muted">
              Qty
            </Text>
            <XStack
              testID={`product-qty-dec-${idx}`}
              role="button"
              aria-label="Decrease quantity"
              onPress={() => update(idx, { quantity: Math.max(1, row.quantity - 1) })}
              {...stepperBox}
            >
              <MaterialIcons name="remove" size={16} color={color} />
            </XStack>
            <Text testID={`product-qty-${idx}`} fontSize={14} fontWeight="800" color="$color">
              {row.quantity}
            </Text>
            <XStack
              testID={`product-qty-inc-${idx}`}
              role="button"
              aria-label="Increase quantity"
              onPress={() => update(idx, { quantity: row.quantity + 1 })}
              {...stepperBox}
            >
              <MaterialIcons name="add" size={16} color={color} />
            </XStack>
            <XStack flex={1} />
            <XStack
              testID={`product-remove-${idx}`}
              role="button"
              aria-label="Remove product"
              onPress={() => remove(idx)}
              pressStyle={{ opacity: 0.7 }}
            >
              <MaterialIcons name="delete-outline" size={20} color={danger} />
            </XStack>
          </XStack>
        </YStack>
      ))}
      <XStack
        testID="product-add"
        role="button"
        aria-label="Add product"
        onPress={add}
        alignItems="center"
        gap={4}
        pressStyle={{ opacity: 0.7 }}
      >
        <MaterialIcons name="add" size={18} color={primary} />
        <Text fontSize={13} fontWeight="800" color="$primary">
          Add product
        </Text>
      </XStack>
      <Text testID="product-total" fontSize={13} fontWeight="800" color="$color">
        Total: ₹{productRequestTotal(value, products)}
      </Text>
      {error ? (
        <Text testID="product-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}
