import { useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { notifySuccess } from '@duncit/dialogs';
import { foodMenuLimitsOf, makeFoodMenuSchema } from '@duncit/forms/schemas';
import { foodMenuToValues, parseApiError, toFoodMenuSaveInput } from '@duncit/utils';
import { UPDATE_VENUE_FOOD_MENU } from '../../documents';
import FoodGstinField from '../fields/FoodGstinField';
import { sendsFoodAccount } from '../fields/FoodOrderingFields';
import VenueFoodFields from '../fields/VenueFoodFields';
import type { FoodMenuFormProps, FoodMenuFormValues } from './food-menu.types';

/**
 * A venue's food menu, QR ordering and invoice GST number — saved through
 * `updateApprovedVenue`, which names only the food fields (and the GST number),
 * so nothing else on the venue moves. A refusal stays above the fields, so
 * nothing typed is lost; a save re-opens the form on the server's copy, so a
 * new dish carries the id it was given.
 */
export default function FoodMenuForm({ venue, config, mode, account, upload, idPrefix, onSaved }: Readonly<FoodMenuFormProps>) {
  const { t } = useTranslation();
  const [apiError, setApiError] = useState<string | null>(null);
  const editsAccount = sendsFoodAccount(account);
  const schema = useMemo(
    () => makeFoodMenuSchema(t, { limits: foodMenuLimitsOf(config), editsAccount }),
    [t, config, editsAccount],
  );
  const { control, handleSubmit, reset } = useForm<FoodMenuFormValues>({
    resolver: zodResolver(schema),
    defaultValues: foodMenuToValues(venue),
    mode: 'onBlur',
  });
  const [save, { loading }] = useMutation(UPDATE_VENUE_FOOD_MENU);
  const savedGstin = venue.gstin ?? '';

  const submit = async (values: FoodMenuFormValues) => {
    setApiError(null);
    try {
      const input = toFoodMenuSaveInput(values, { sendAccount: editsAccount, mode, savedGstin });
      const res = await save({ variables: { venue_id: venue.id, input } });
      const saved = res.data?.updateApprovedVenue;
      if (!saved) return;
      reset(foodMenuToValues(saved));
      notifySuccess(t('venueFoodOwner.menu.saved'));
      onSaved?.(saved);
    } catch (error) {
      setApiError(parseApiError(error));
    }
  };

  return (
    <Stack spacing={2.5} component="form" onSubmit={handleSubmit(submit)} noValidate data-testid={`${idPrefix}-form`}>
      {apiError && (
        <Alert severity="error" data-testid={`${idPrefix}-error`}>
          {apiError}
        </Alert>
      )}
      <VenueFoodFields
        control={control}
        config={config}
        account={account}
        upload={upload}
        idPrefix={idPrefix}
        venueName={venue.venue_name}
        hasSavedTables={(venue.food_tables ?? []).length > 0}
        gstin={<FoodGstinField control={control} name="gstin" savedGstin={savedGstin} mode={mode} idPrefix={idPrefix} />}
      />
      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <DuncitButton type="submit" variant="contained" loading={loading} data-testid={`${idPrefix}-save`}>
          {t('venueFoodOwner.common.save')}
        </DuncitButton>
      </Stack>
    </Stack>
  );
}
