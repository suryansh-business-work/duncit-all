import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import { makeShipToSchema, type ShipToValues } from '@duncit/forms/schemas';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { ShipToFields } from '@/components/ShipToFields';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';

interface Props {
  open: boolean;
  /** The order's current ship-to — the sheet opens on it. */
  initial: ShipToValues;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: ShipToValues) => void;
}

/** Brand Orders → Fix address: correct an order's delivery address before
 * ShipRocket has it (React Hook Form + Zod, @duncit/forms' courier rules).
 * RN twin of mWeb's ShipToForm. */
export function BrandShipToSheet({ open, initial, saving, onCancel, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeShipToSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<ShipToValues, unknown, ShipToValues>({
    defaultValues: initial,
    resolver: formResolver<ShipToValues>(schema),
    mode: 'onTouched',
  });

  useEffect(() => {
    if (open) reset(initial);
  }, [open, initial, reset]);

  const footer = (
    <XStack gap={12}>
      <YStack flex={1}>
        <DuncitButton
          label={t('mweb.common.cancel')}
          variant="outline"
          fullWidth
          disabled={saving}
          testID="ship-to-cancel"
          onPress={onCancel}
        />
      </YStack>
      <YStack flex={1}>
        <DuncitButton
          label={t('mweb.brandOrders.saveAddress')}
          fullWidth
          loading={saving}
          testID="ship-to-save"
          onPress={handleSubmit(onSubmit)}
        />
      </YStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open={open}
      onClose={onCancel}
      testID="ship-to-sheet"
      title={t('mweb.brandOrders.addressTitle')}
      closeLabel={t('mweb.common.close')}
      dismissOnBackdrop={!saving}
      footer={footer}
    >
      <YStack gap={12}>
        <Text fontSize={13} color="$muted">
          {t('mweb.brandOrders.addressHint')}
        </Text>
        <ShipToFields control={control} />
      </YStack>
    </DuncitDialog>
  );
}
