import { Controller, type UseFormReturn } from 'react-hook-form';
import { Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { PartnerIntegration } from '../../../ecomm-brand-page/integrations/integrations.queries';
import type { RegisterVenueValues } from '../../register-venue';

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
  connections: PartnerIntegration[];
  loading: boolean;
}

/**
 * Which of the owner's saved Razorpay accounts the venue's food orders are paid
 * into. Only an account that passed its connection check can be picked; one
 * that did not stays listed, disabled, with the reason.
 */
export default function RazorpayAccountSelect({ form, connections, loading }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Controller
      name="food_ordering.razorpay_integration_id"
      control={form.control}
      render={({ field: { ref, ...field }, fieldState }) => (
        <TextField
          {...field}
          inputRef={ref}
          // Until the list has loaded the saved id matches no option yet.
          value={connections.some((connection) => connection.id === field.value) ? field.value : ''}
          select
          fullWidth
          size="small"
          disabled={loading}
          label={t('partners.registerVenuePage.foodOrderingAccount')}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message ?? t('partners.registerVenuePage.foodOrderingAccountHint')}
          slotProps={{ htmlInput: { 'data-testid': 'register-venue-food-razorpay' } }}
        >
          <MenuItem value="">{t('partners.registerVenuePage.foodOrderingNoAccount')}</MenuItem>
          {connections.map(({ id, label, status }) => (
            <MenuItem key={id} value={id} disabled={!status.connected}>
              <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" component="span" sx={{ fontWeight: 700 }}>
                  {label}
                </Typography>
                <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
                  {status.identifier}
                </Typography>
                <Chip
                  size="small"
                  variant="outlined"
                  color={status.live_mode ? 'warning' : 'default'}
                  label={
                    status.live_mode
                      ? t('partners.brandWizard.integration.liveMode')
                      : t('partners.brandWizard.integration.testMode')
                  }
                />
                {!status.connected && (
                  <Typography variant="caption" component="span" sx={{ color: 'error.main' }}>
                    {status.message || t('partners.brandWizard.integration.notConnected')}
                  </Typography>
                )}
              </Stack>
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}
