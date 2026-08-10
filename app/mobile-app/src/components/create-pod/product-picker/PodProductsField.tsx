import { useMemo, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { podProductRequestsTotal, type PodPickerProduct } from '@duncit/utils';
import type { PodProductRequest } from '../create-pod.types';
import { AttachedProductRow } from './AttachedProductRow';
import { ProductPickerDialog } from './ProductPickerDialog';

interface Props {
  value: PodProductRequest[];
  onChange: (next: PodProductRequest[]) => void;
  /** Already narrowed to the pod's Super → Category → Sub by the caller. */
  products: PodPickerProduct[];
  error?: string;
}

/**
 * Step 4's whole products block: what is attached, and the one door to attaching
 * more.
 *
 * There is no "Attach products to this pod" checkbox any more — attaching IS
 * adding a product, so the button is the only control and `products_enabled`
 * follows from whether the list is empty. That removes the state this form used
 * to allow (toggle on, nothing chosen) which is what let an incomplete product
 * association reach the server. mWeb twin (PodProductsField).
 */
export function PodProductsField({ value, onChange, products, error }: Readonly<Props>) {
  const { primary, muted } = useThemeColors();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const byId = useMemo(
    () => new Map(products.map((product) => [String(product.id), product])),
    [products],
  );
  const addedIds = useMemo(() => value.map((row) => row.product_id), [value]);
  const total = podProductRequestsTotal(value, products);
  const noProducts = products.length === 0;

  const add = (productId: string, quantity: number) =>
    onChange([...value, { product_id: productId, quantity }]);
  const setQuantity = (index: number, quantity: number) =>
    onChange(value.map((row, i) => (i === index ? { ...row, quantity } : row)));
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  return (
    <YStack gap={10}>
      <Text fontSize={14} fontWeight="700" color="$color">
        {t('podProduct.attachedTitle')}
      </Text>

      {value.length === 0 ? (
        <Text testID="products-empty" fontSize={12.5} color="$muted">
          {t('podProduct.attachedEmpty')}
        </Text>
      ) : null}

      {value.map((row, index) => {
        const product = byId.get(String(row.product_id));
        // A row whose product has left the catalogue (category changed, listing
        // pulled) is dropped by pruneProductRequests on the next cascade; until
        // then there is nothing to render for it.
        if (!product) return null;
        return (
          <AttachedProductRow
            key={row.product_id}
            testID={`attached-product-${row.product_id}`}
            product={product}
            quantity={row.quantity}
            onQuantityChange={(quantity) => setQuantity(index, quantity)}
            onRemove={() => remove(index)}
          />
        );
      })}

      {/* Nothing to pick means the dialog could only ever show its empty state,
          so the door stays shut — mWeb disables the same button (rule 27). */}
      <XStack
        testID="product-add"
        role="button"
        aria-label={t('podProduct.addButton')}
        aria-disabled={noProducts}
        onPress={noProducts ? undefined : () => setOpen(true)}
        alignItems="center"
        justifyContent="center"
        gap={6}
        height={44}
        borderRadius={12}
        borderWidth={1}
        borderColor="$primary"
        opacity={noProducts ? 0.5 : 1}
        pressStyle={{ opacity: 0.75 }}
      >
        <MaterialIcons name="add-shopping-cart" size={18} color={primary} />
        <Text fontSize={14} fontWeight="700" color="$primary">
          {t('podProduct.addButton')}
        </Text>
      </XStack>

      {noProducts ? (
        <Text testID="products-empty-category" fontSize={12.5} color={muted}>
          {t('podProduct.emptyCategory')}
        </Text>
      ) : null}

      {value.length > 0 ? (
        <Text testID="product-total" fontSize={13} fontWeight="700" color="$color">
          {t('podProduct.productTotal', { vars: { amount: `₹${total}` } })}
        </Text>
      ) : null}

      {error ? (
        <Text testID="product-error" fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}

      <ProductPickerDialog
        open={open}
        onClose={() => setOpen(false)}
        products={products}
        addedIds={addedIds}
        onAdd={add}
      />
    </YStack>
  );
}
