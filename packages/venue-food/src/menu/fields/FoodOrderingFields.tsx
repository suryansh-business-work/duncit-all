import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Controller, useWatch, type FieldValues } from 'react-hook-form';
import { Alert, FormControlLabel, FormHelperText, Stack, Switch, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { FoodTaxFields, RhfTextField } from '@duncit/forms';
import { canTakeFoodOrders, parseApiError, razorpayConnectionsOf, type FoodMenuConfig } from '@duncit/utils';
import { FOOD_RAZORPAY_CONNECTIONS } from '../../documents';
import FoodAccountPicker, { type AddFoodAccount } from './FoodAccountPicker';
import FoodAccountStatus from './FoodAccountStatus';
import { menuPath, orderingPath, type FoodControlProps } from './food-paths';

/**
 * How a surface handles the Razorpay account guests pay: an owner surface that
 * can pick it (the picker, plus its own way to add one), or a read-only state —
 * the Venues console, or an owner surface that sends the owner elsewhere to
 * change it. Which one also decides whether a save names the account at all
 * (`toVenueFoodInput`'s `sendAccount`).
 */
export type FoodAccountMode = { kind: 'picker'; addAccount?: AddFoodAccount } | { kind: 'status'; manageHref?: string };

/** Whether a save from this surface names the account — only the picker edits it. */
export const sendsFoodAccount = (account: FoodAccountMode): boolean => account.kind === 'picker';

interface Props<T extends FieldValues, TOut> extends FoodControlProps<T, TOut> {
  config: FoodMenuConfig;
  account: FoodAccountMode;
  idPrefix: string;
}

const isAvailableList = (value: unknown): { is_available: boolean }[] =>
  Array.isArray(value) ? value.map((dish: { is_available?: unknown }) => ({ is_available: dish?.is_available === true })) : [];

/**
 * Online ordering & payments: the account guests pay, the switch that opens
 * ordering from the venue's QR, the QR discount and the venue's GST. The
 * switch can only be turned ON with an account and a dish to order — it can
 * always be turned off.
 */
export default function FoodOrderingFields<T extends FieldValues, TOut = T>({
  control,
  config,
  account,
  idPrefix,
}: Readonly<Props<T, TOut>>) {
  const { t } = useTranslation();
  const picking = account.kind === 'picker';
  const { data, loading, error } = useQuery(FOOD_RAZORPAY_CONNECTIONS, {
    fetchPolicy: 'cache-and-network',
    skip: !picking,
  });
  const connections = useMemo(() => razorpayConnectionsOf(data?.myPartnerIntegrations ?? []), [data]);
  const menu = isAvailableList(useWatch({ control, name: menuPath<T>() }));
  const accountId: unknown = useWatch({ control, name: orderingPath<T>('razorpay_integration_id') });
  const linked = useWatch({ control, name: orderingPath<T>('razorpay_linked') }) === true;
  const accountReady = picking
    ? connections.some((connection) => connection.id === accountId && connection.status.connected)
    : linked;
  const canEnable = canTakeFoodOrders(menu, accountReady);
  const hintId = `${idPrefix}-food-ordering-hint`;

  return (
    <Stack spacing={1.5} data-testid={`${idPrefix}-food-ordering`}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 800 }}>
          {t('venueFoodOwner.menu.orderingTitle')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('venueFoodOwner.menu.orderingIntro')}
        </Typography>
      </Stack>
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {account.kind === 'picker' ? (
        <FoodAccountPicker
          control={control}
          connections={connections}
          loading={loading && !data}
          idPrefix={idPrefix}
          addAccount={account.addAccount}
        />
      ) : (
        <FoodAccountStatus linked={linked} manageHref={account.manageHref} idPrefix={idPrefix} />
      )}
      <Controller
        name={orderingPath<T>('enabled')}
        control={control}
        render={({ field, fieldState }) => (
          <Stack spacing={0}>
            <FormControlLabel
              control={
                <Switch
                  checked={field.value === true}
                  onChange={(_, checked) => field.onChange(checked)}
                  onBlur={field.onBlur}
                  disabled={!canEnable && field.value !== true}
                  slotProps={{ input: { 'aria-describedby': hintId } }}
                  data-testid={`${idPrefix}-food-ordering-enabled`}
                />
              }
              label={t('venueFoodOwner.menu.orderingEnabled')}
            />
            <FormHelperText id={hintId} error={Boolean(fieldState.error)} sx={{ mt: 0 }}>
              {fieldState.error?.message ??
                (canEnable ? t('venueFoodOwner.menu.orderingEnabledHint') : t('venueFoodOwner.menu.orderingLockedHint'))}
            </FormHelperText>
          </Stack>
        )}
      />
      <RhfTextField
        control={control}
        name={orderingPath<T>('discount_pct')}
        label={t('venueFoodOwner.menu.discount')}
        hint={t('venueFoodOwner.menu.discountHint', { vars: { max: config.food_discount_max_pct } })}
        type="number"
        size="small"
        fullWidth={false}
        sx={{ maxWidth: 260 }}
        slotProps={{ htmlInput: { min: 0, max: config.food_discount_max_pct, step: 1, inputMode: 'numeric' } }}
        data-testid={`${idPrefix}-food-ordering-discount`}
      />
      <Stack spacing={0.5}>
        <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 800 }}>
          {t('venueFoodOwner.menu.taxTitle')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('venueFoodOwner.menu.taxIntro')}
        </Typography>
      </Stack>
      <FoodTaxFields control={control} t={t} prefix="food_ordering" idPrefix={`${idPrefix}-food`} />
    </Stack>
  );
}
