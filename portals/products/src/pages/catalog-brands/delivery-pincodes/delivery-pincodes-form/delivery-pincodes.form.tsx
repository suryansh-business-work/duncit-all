import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import {
  deliveryPincodesInitialValues,
  makeDeliveryPincodesSchema,
  parsePincodes,
  type DeliveryPincodesFormValues,
} from './delivery-pincodes.types';

interface Props {
  saving?: boolean;
  /** Resolves true once the pincodes were added, so the box can be cleared. */
  onSubmit: (pincodes: string[]) => Promise<boolean>;
}

/** Paste pincodes (one per line, or comma separated) to add to a brand's delivery area. */
export default function DeliveryPincodesForm({ saving, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeDeliveryPincodesSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<DeliveryPincodesFormValues, unknown, DeliveryPincodesFormValues>({
    defaultValues: deliveryPincodesInitialValues,
    resolver: zodResolver(schema) as unknown as Resolver<DeliveryPincodesFormValues, unknown, DeliveryPincodesFormValues>,
    mode: 'onTouched',
  });

  const submit = handleSubmit(async (values) => {
    if (await onSubmit(parsePincodes(values.pincodes))) reset(deliveryPincodesInitialValues);
  });

  return (
    <form noValidate onSubmit={submit}>
      <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
        <RhfTextField
          control={control}
          name="pincodes"
          label={t('products.deliveryPincodes.fieldLabel')}
          hint={t('products.deliveryPincodes.fieldHint')}
          multiline
          minRows={2}
          maxRows={6}
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        />
        <DuncitButton type="submit" size="small" startIcon={<AddIcon />} disabled={saving}>
          {saving ? t('products.deliveryPincodes.adding') : t('products.deliveryPincodes.add')}
        </DuncitButton>
      </Stack>
    </form>
  );
}
