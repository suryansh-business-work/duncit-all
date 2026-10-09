import { useMemo, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { shipToValues, type ShipToValues } from '@duncit/forms/schemas';
import { brandOrderActions, type ShipmentDocumentKind } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { BrandOrder } from '@/hooks/useBrandOrder';
import { BrandOrderDocuments } from './BrandOrderDocuments';
import { BrandShipToSheet } from './BrandShipToSheet';

interface Props {
  order: BrandOrder;
  busy: boolean;
  onBook: () => void;
  onRefresh: () => void;
  onDocument: (kind: ShipmentDocumentKind, mode: 'print' | 'download') => void;
  /** Resolves true once saved, so the sheet closes only on success. */
  onSaveAddress: (values: ShipToValues) => Promise<boolean>;
}

/**
 * The order's actions — only those the shared rule (`brandOrderActions`) says
 * this order allows right now. RN twin of mWeb's BrandOrderActions.
 */
export function BrandOrderActions({
  order,
  busy,
  onBook,
  onRefresh,
  onDocument,
  onSaveAddress,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { color, onPrimary } = useThemeColors();
  const allowed = brandOrderActions(order);
  const [editing, setEditing] = useState(false);
  const initial = useMemo(() => shipToValues(order.shipping_address), [order.shipping_address]);
  if (!allowed.book && !allowed.editAddress && !allowed.documents && !allowed.refreshTracking)
    return null;
  const icon = (name: 'local-shipping' | 'edit-location' | 'sync', solid = false) => (
    <MaterialIcons name={name} size={16} color={solid ? onPrimary : color} />
  );

  return (
    <YStack gap={10} testID="brand-order-actions">
      <Text role="heading" fontSize={14} fontWeight="700" color="$color">
        {t('mweb.brandOrders.actions')}
      </Text>
      <XStack gap={8} flexWrap="wrap">
        {allowed.book ? (
          <DuncitButton
            label={t(order.last_error ? 'mweb.brandOrders.retryBooking' : 'mweb.brandOrders.book')}
            size="sm"
            icon={icon('local-shipping', true)}
            disabled={busy}
            testID="brand-order-book"
            onPress={onBook}
          />
        ) : null}
        {allowed.editAddress ? (
          <DuncitButton
            label={t('mweb.brandOrders.fixAddress')}
            variant="outline"
            size="sm"
            icon={icon('edit-location')}
            disabled={busy}
            testID="brand-order-fix-address"
            onPress={() => setEditing(true)}
          />
        ) : null}
        {allowed.refreshTracking ? (
          <DuncitButton
            label={t('mweb.brandOrders.refreshTracking')}
            variant="outline"
            size="sm"
            icon={icon('sync')}
            disabled={busy}
            testID="brand-order-refresh"
            onPress={onRefresh}
          />
        ) : null}
      </XStack>
      {allowed.documents ? <BrandOrderDocuments busy={busy} onDocument={onDocument} /> : null}
      <BrandShipToSheet
        open={editing}
        initial={initial}
        saving={busy}
        onCancel={() => setEditing(false)}
        onSubmit={async (values) => {
          if (await onSaveAddress(values)) setEditing(false);
        }}
      />
    </YStack>
  );
}
