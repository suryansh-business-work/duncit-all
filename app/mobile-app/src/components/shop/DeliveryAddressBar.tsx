import { useEffect, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { deliveryAddressLine } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { AddressSheet } from '@/components/checkout/AddressSheet';
import { DuncitButton } from '@/components/DuncitButton';
import { LoadErrorNotice } from '@/components/club-admin/LoadErrorNotice';
import { useDeliveryAddress } from '@/hooks/useDeliveryAddress';
import { useSession } from '@/hooks/useSession';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/** The Pod Shop's "Deliver to" bar under the back bar — the address the shop's
 * orders ship to, from the buyer's address book, in place of a city. Tapping
 * lists every saved address to switch between, with a way into the address
 * book. Reports the chosen pincode ('' for none) once the address book has
 * loaded, so the shop can leave out brands that do not deliver there. RN twin
 * of mWeb's HeaderDeliveryAddress. */
export function DeliveryAddressBar({
  onPincodeChange,
}: Readonly<{ onPincodeChange?: (pincode: string) => void }>) {
  const { t } = useTranslation();
  const { accent, muted } = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAuthenticated } = useSession();
  const { addresses, selected, select, loading, failed, reload } =
    useDeliveryAddress(isAuthenticated);
  const [open, setOpen] = useState(false);
  const pincode = selected?.pincode ?? '';
  useEffect(() => {
    if (!loading) onPincodeChange?.(pincode);
  }, [loading, pincode, onPincodeChange]);
  const manage = () => {
    setOpen(false);
    navigation.navigate('AddressBook');
  };
  const line = selected ? deliveryAddressLine(selected) : t('mweb.shop.addDeliveryAddress');
  const caption = selected
    ? `${t('mweb.checkout.deliverTo')} · ${selected.label}`
    : t('mweb.checkout.deliverTo');

  let status;
  if (loading) {
    status = (
      <YStack alignItems="center" paddingVertical={32}>
        <Spinner size="large" />
      </YStack>
    );
  } else if (failed && addresses.length === 0) {
    status = (
      <YStack paddingHorizontal={16} paddingBottom={16}>
        <LoadErrorNotice
          testID="delivery-address-error"
          message={t('mweb.shop.addressesLoadError')}
          retryLabel={t('mweb.shop.retry')}
          onRetry={reload}
        />
      </YStack>
    );
  } else if (addresses.length === 0) {
    status = (
      <Text
        testID="delivery-address-empty"
        paddingHorizontal={16}
        paddingBottom={16}
        fontSize={14}
        color="$muted"
      >
        {t('mweb.shop.noSavedAddresses')}
      </Text>
    );
  }

  return (
    <YStack paddingHorizontal={16} paddingBottom={4}>
      <XStack
        testID="shop-delivery-address"
        role="button"
        tabIndex={0}
        aria-label={t('mweb.shop.changeDeliveryAddress')}
        accessibilityHint={line}
        onPress={isAuthenticated ? () => setOpen(true) : manage}
        alignSelf="flex-start"
        maxWidth="100%"
        alignItems="center"
        gap={8}
        minHeight={44}
        paddingHorizontal={12}
        paddingVertical={6}
        borderRadius={999}
        borderWidth={1}
        borderColor="$cardBorder"
        backgroundColor="$surface"
        pressStyle={PRESS_STYLE.surface}
      >
        <MaterialIcons name="location-on" size={18} color={accent} />
        <YStack flexShrink={1}>
          <Text fontSize={10} fontWeight="600" color="$muted" numberOfLines={1}>
            {caption}
          </Text>
          <Text
            testID="shop-delivery-address-line"
            fontSize={13}
            fontWeight="600"
            color="$color"
            numberOfLines={1}
          >
            {line}
          </Text>
        </YStack>
        <MaterialIcons name="keyboard-arrow-down" size={18} color={muted} />
      </XStack>

      <AddressSheet
        testID="delivery-address"
        open={open}
        onClose={() => setOpen(false)}
        title={t('mweb.shop.deliveryTitle')}
        addresses={addresses}
        selectedId={selected?.id ?? ''}
        onSelect={(address) => select(address.id)}
        status={status}
        footer={
          <DuncitButton
            testID="delivery-address-manage"
            variant="outline"
            fullWidth
            label={
              addresses.length === 0
                ? t('mweb.shop.addDeliveryAddress')
                : t('mweb.shop.manageAddresses')
            }
            onPress={manage}
          />
        }
      />
    </YStack>
  );
}
