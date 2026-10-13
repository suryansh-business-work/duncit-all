import { useState } from 'react';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { Alert, FormControlLabel, FormHelperText, Stack, Switch, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import ConnectionDialog from '../../../ecomm-brand-page/integrations/ConnectionDialog';
import type { PartnerIntegration } from '../../../ecomm-brand-page/integrations/integrations.queries';
import type { RegisterVenueValues, VenueRegistrationConfig } from '../../register-venue';
import RazorpayAccountSelect from './RazorpayAccountSelect';
import { useRazorpayConnections } from './useRazorpayConnections';

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
  config: VenueRegistrationConfig;
}

const ENABLED_HINT_ID = 'register-venue-food-ordering-hint';

/**
 * Online ordering & payments: the Razorpay account guests pay, the switch that
 * opens ordering from the venue's QR, and the QR discount. The switch can only
 * be turned ON with a connected account and a dish to order — it can always be
 * turned off.
 */
export default function FoodOrderingField({ form, config }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control } = form;
  const [dialogOpen, setDialogOpen] = useState(false);
  const { connections, loading, error } = useRazorpayConnections();
  const menu = useWatch({ control, name: 'food_menu' });
  const accountId = useWatch({ control, name: 'food_ordering.razorpay_integration_id' });
  const account = connections.find((connection) => connection.id === accountId);
  const canEnable = account?.status.connected === true && menu.some((row) => row.is_available);

  // The dialog has refetched the list by now; an account that failed its check
  // cannot take orders, so it is left for the owner to fix rather than picked.
  const pickSaved = (saved: PartnerIntegration) => {
    if (!saved.status.connected) return;
    form.setValue('food_ordering.razorpay_integration_id', saved.id, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <Stack spacing={1.5} data-testid="register-venue-food-ordering">
      <Stack spacing={0.5}>
        <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 800 }}>
          {t('partners.registerVenuePage.foodOrderingTitle')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('partners.registerVenuePage.foodOrderingIntro')}
        </Typography>
      </Stack>
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'flex-start' } }}>
        <RazorpayAccountSelect form={form} connections={connections} loading={loading} />
        <DuncitButton
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{ flexShrink: 0 }}
          data-testid="register-venue-food-add-razorpay"
        >
          {t('partners.registerVenuePage.foodOrderingAddAccount')}
        </DuncitButton>
      </Stack>
      <Controller
        name="food_ordering.enabled"
        control={control}
        render={({ field, fieldState }) => (
          <Stack spacing={0}>
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={(_, checked) => field.onChange(checked)}
                  onBlur={field.onBlur}
                  disabled={!canEnable && !field.value}
                  slotProps={{ input: { 'aria-describedby': ENABLED_HINT_ID } }}
                  data-testid="register-venue-food-ordering-enabled"
                />
              }
              label={t('partners.registerVenuePage.foodOrderingEnabled')}
            />
            <FormHelperText id={ENABLED_HINT_ID} error={Boolean(fieldState.error)} sx={{ mt: 0 }}>
              {fieldState.error?.message ??
                (canEnable
                  ? t('partners.registerVenuePage.foodOrderingEnabledHint')
                  : t('partners.registerVenuePage.foodOrderingLockedHint'))}
            </FormHelperText>
          </Stack>
        )}
      />
      <RhfTextField
        control={control}
        name="food_ordering.discount_pct"
        label={t('partners.registerVenuePage.foodOrderingDiscount')}
        hint={t('partners.registerVenuePage.foodOrderingDiscountHint', { vars: { max: config.food_discount_max_pct } })}
        type="number"
        size="small"
        fullWidth={false}
        sx={{ maxWidth: 260 }}
        slotProps={{ htmlInput: { min: 0, max: config.food_discount_max_pct, step: 1 } }}
      />
      <ConnectionDialog
        open={dialogOpen}
        provider="RAZORPAY"
        connection={null}
        onClose={() => setDialogOpen(false)}
        onSaved={pickSaved}
      />
    </Stack>
  );
}
