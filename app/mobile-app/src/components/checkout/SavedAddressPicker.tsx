import { useEffect, useRef, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { AddressSheet } from '@/components/checkout/AddressSheet';
import { useDeliveryAddress, type UserAddress } from '@/hooks/useDeliveryAddress';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  onPick: (address: UserAddress) => void;
}

const summary = (address: UserAddress, defaultTag: string) => {
  const tag = address.is_default ? ` ${defaultTag}` : '';
  const where = [address.line1, address.city].filter(Boolean).join(', ');
  return `${address.label}${tag} — ${where}`;
};

/** Checkout address-book dropdown — the saved delivery address the order ships
 * to and that delivery charges are quoted for. It opens on the address the Pod
 * Shop's "Deliver to" bar picked (else the default), and a pick here becomes the
 * shop's delivery address too (picking re-quotes delivery). Hidden while the
 * book is empty. RN twin of mWeb's SavedAddressPicker. */
export function SavedAddressPicker({ onPick }: Readonly<Props>) {
  const { muted, primary } = useThemeColors();
  const { t } = useTranslation();
  const { addresses, selected, select } = useDeliveryAddress();
  const [open, setOpen] = useState(false);
  const pickedRef = useRef('');

  // Hand the chosen address to the form once per change.
  useEffect(() => {
    if (!selected || pickedRef.current === selected.id) return;
    pickedRef.current = selected.id;
    onPick(selected);
  }, [selected, onPick]);

  if (addresses.length === 0) return null;

  return (
    <YStack gap={6} testID="checkout-address-picker">
      <Text fontSize={12} fontWeight="600" color="$muted">
        {t('mweb.checkout.deliverTo')}
      </Text>
      <XStack
        testID="checkout-address-field"
        role="button"
        tabIndex={0}
        aria-label={t('mweb.checkout.chooseAddress')}
        onPress={() => setOpen(true)}
        alignItems="center"
        gap={10}
        padding={12}
        borderRadius={14}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
        pressStyle={PRESS_STYLE.control}
      >
        <MaterialIcons name="home-work" size={18} color={primary} />
        <Text
          testID="checkout-address-field-label"
          flex={1}
          fontSize={13}
          fontWeight="700"
          color="$color"
          numberOfLines={1}
        >
          {selected
            ? summary(selected, t('mweb.checkout.addressDefault'))
            : t('mweb.checkout.selectAddress')}
        </Text>
        <MaterialIcons name="expand-more" size={20} color={muted} />
      </XStack>

      <AddressSheet
        testID="checkout-address"
        open={open}
        onClose={() => setOpen(false)}
        title={t('mweb.checkout.deliverToSaved')}
        addresses={addresses}
        selectedId={selected?.id ?? ''}
        onSelect={(address) => select(address.id)}
      />
    </YStack>
  );
}
