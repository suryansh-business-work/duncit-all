import { Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { ProductRequestsField } from '../ProductRequestsField';
import type { CreatePodForm, CreatePodProduct } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  products: CreatePodProduct[];
}

/** Step 6 — optionally attach Duncit products to the pod. */
export function ProductsStep({ form, products }: Readonly<Props>) {
  const { color } = useThemeColors();
  const enabled = form.watch('products_enabled');
  const toggle = () => {
    const next = !enabled;
    form.setValue('products_enabled', next);
    if (!next) form.setValue('product_requests', []);
  };

  return (
    <YStack gap={14}>
      <XStack
        testID="products-enabled-toggle"
        role="button"
        aria-label="Attach products"
        aria-pressed={enabled}
        onPress={toggle}
        alignItems="center"
        gap={8}
        pressStyle={{ opacity: 0.7 }}
      >
        <MaterialIcons
          name={enabled ? 'check-box' : 'check-box-outline-blank'}
          size={22}
          color={color}
        />
        <Text fontSize={14} fontWeight="600" color="$color">
          Attach products to this pod
        </Text>
      </XStack>
      {enabled ? (
        <Controller
          control={form.control}
          name="product_requests"
          render={({ field, fieldState }) => (
            <ProductRequestsField
              value={field.value}
              onChange={field.onChange}
              products={products}
              error={fieldState.error?.message}
            />
          )}
        />
      ) : null}
    </YStack>
  );
}
