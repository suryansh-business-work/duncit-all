import { useMemo, useState } from 'react';
import { Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import {
  BLANK_POD_PRODUCT_CRITERIA,
  clampPodProductQty,
  filterPodProducts,
  podProductBrands,
  type PodPickerProduct,
  type PodProductCriteria,
} from '@duncit/utils';
import { ProductPickerCard } from './ProductPickerCard';
import { ProductPickerFilters } from './ProductPickerFilters';
import { ProductQuantityBar } from './ProductQuantityBar';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Already narrowed to the pod's Super → Category → Sub by the caller. */
  products: PodPickerProduct[];
  /** Product ids already attached to this pod — shown as "Added", not pickable. */
  addedIds: string[];
  onAdd: (productId: string, quantity: number) => void;
}

/**
 * The full-screen "Add a Product" browser for Create a Pod.
 *
 * Selection is mandatory and explicit: the host picks a product by tapping its
 * card, which highlights it and is the ONLY thing that enables the quantity
 * stepper. Changing the pick resets the quantity, so a count chosen for one
 * product can never be carried onto another. mWeb twin (PodProductDialog).
 */
export function ProductPickerDialog({ open, onClose, products, addedIds, onAdd }: Readonly<Props>) {
  const { muted } = useThemeColors();
  const { t } = useTranslation();
  const [criteria, setCriteria] = useState<PodProductCriteria>(BLANK_POD_PRODUCT_CRITERIA);
  const [selectedId, setSelectedId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  const added = useMemo(() => new Set(addedIds.map(String)), [addedIds]);
  const brands = useMemo(() => podProductBrands(products), [products]);
  const visible = useMemo(() => filterPodProducts(products, criteria), [products, criteria]);
  const selected = useMemo(
    () => products.find((product) => product.id === selectedId) ?? null,
    [products, selectedId],
  );

  const reset = () => {
    setCriteria(BLANK_POD_PRODUCT_CRITERIA);
    setSelectedId('');
    setQuantity(1);
    setError('');
  };

  const close = () => {
    reset();
    onClose();
  };

  // A new pick starts at 1 — never inherits the count chosen for the last one.
  const select = (id: string) => {
    setSelectedId(id);
    setQuantity(1);
    setError('');
  };

  const submit = () => {
    if (!selected) {
      setError(t('podProduct.selectFirst'));
      return;
    }
    onAdd(selected.id, clampPodProductQty(quantity, selected));
    reset();
    onClose();
  };

  let list = (
    <YStack gap={10}>
      {visible.map((product) => (
        <ProductPickerCard
          key={product.id}
          product={product}
          selected={product.id === selectedId}
          added={added.has(String(product.id))}
          onSelect={select}
        />
      ))}
    </YStack>
  );
  if (products.length === 0) {
    list = (
      <Text testID="product-picker-empty-category" fontSize={13} color="$muted">
        {t('podProduct.emptyCategory')}
      </Text>
    );
  } else if (visible.length === 0) {
    list = (
      <Text testID="product-picker-empty-search" fontSize={13} color="$muted">
        {t('podProduct.emptySearch')}
      </Text>
    );
  }

  return (
    <Modal visible={open} animationType="slide" onRequestClose={close}>
      <ModalThemeScope>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <YStack flex={1} backgroundColor="$background">
            <XStack
              alignItems="center"
              gap={10}
              paddingHorizontal={14}
              paddingVertical={12}
              borderBottomWidth={1}
              borderBottomColor="$borderColor"
            >
              <YStack flex={1}>
                <Text fontSize={16.5} fontWeight="700" color="$color">
                  {t('podProduct.dialogTitle')}
                </Text>
                <Text fontSize={12} color="$muted">
                  {t('podProduct.dialogSubtitle')}
                </Text>
              </YStack>
              <XStack
                testID="product-picker-close"
                role="button"
                aria-label={t('podProduct.close')}
                onPress={close}
                width={34}
                height={34}
                alignItems="center"
                justifyContent="center"
                pressStyle={PRESS_STYLE.inline}
              >
                <MaterialIcons name="close" size={22} color={muted} />
              </XStack>
            </XStack>

            <ScrollView keyboardShouldPersistTaps="handled">
              <YStack gap={12} padding={14}>
                <ProductPickerFilters
                  criteria={criteria}
                  onChange={setCriteria}
                  onClear={() => setCriteria(BLANK_POD_PRODUCT_CRITERIA)}
                  brands={brands}
                />
                <Text testID="product-picker-count" fontSize={12} color="$muted">
                  {t('podProduct.resultCount', { vars: { count: visible.length } })}
                </Text>
                {list}
              </YStack>
            </ScrollView>

            <ProductQuantityBar
              product={selected}
              quantity={quantity}
              onQuantityChange={setQuantity}
              onAdd={submit}
              error={error}
            />
          </YStack>
        </SafeAreaView>
      </ModalThemeScope>
    </Modal>
  );
}
