import type { ReactNode } from 'react';
import { useController, type FieldValues } from 'react-hook-form';
import { Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import type { FoodRazorpayConnection } from '@duncit/utils';
import { orderingPath, type FoodControlProps } from './food-paths';

/** Opens the surface's own "add an account" flow; `select` picks the account it saved. */
export type AddFoodAccount = (select: (connectionId: string) => void) => ReactNode;

interface Props<T extends FieldValues, TOut> extends FoodControlProps<T, TOut> {
  connections: FoodRazorpayConnection[];
  loading: boolean;
  idPrefix: string;
  addAccount?: AddFoodAccount;
}

/**
 * Which of the owner's saved Razorpay accounts the venue's food orders are paid
 * into. Only an account that passed its connection check can be picked; one
 * that did not stays listed, disabled, with the reason.
 */
export default function FoodAccountPicker<T extends FieldValues, TOut = T>({
  control,
  connections,
  loading,
  idPrefix,
  addAccount,
}: Readonly<Props<T, TOut>>) {
  const { t } = useTranslation();
  const {
    field: { ref, value, onChange, onBlur, name },
    fieldState,
  } = useController({ control, name: orderingPath<T>('razorpay_integration_id') });
  // Until the list has loaded the saved id matches no option yet.
  const selected = connections.some((connection) => connection.id === value) ? value : '';

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'flex-start' } }}>
      <TextField
        name={name}
        inputRef={ref}
        value={selected}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        select
        fullWidth
        size="small"
        disabled={loading}
        label={t('venueFoodOwner.menu.account')}
        error={Boolean(fieldState.error)}
        helperText={fieldState.error?.message ?? t('venueFoodOwner.menu.accountHint')}
        slotProps={{ htmlInput: { 'data-testid': `${idPrefix}-food-razorpay` } }}
      >
        <MenuItem value="">{t('venueFoodOwner.menu.noAccount')}</MenuItem>
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
                label={status.live_mode ? t('venueFoodOwner.menu.liveMode') : t('venueFoodOwner.menu.testMode')}
              />
              {!status.connected && (
                <Typography variant="caption" component="span" sx={{ color: 'error.main' }}>
                  {status.message || t('venueFoodOwner.menu.notConnected')}
                </Typography>
              )}
            </Stack>
          </MenuItem>
        ))}
      </TextField>
      {addAccount?.((connectionId) => onChange(connectionId))}
    </Stack>
  );
}
