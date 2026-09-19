import { useMemo } from 'react';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { useQuery } from '@apollo/client/react';
import { Alert, MenuItem, Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { codeLabel } from '../../../../lib/status';
import type { Translate } from '../../../../lib/translate';
import { STORE_RAZORPAY_ACCOUNTS, type RazorpayMode, type StoreRazorpayAccount } from '../../queries';

const MODE_KEYS: Record<RazorpayMode, string> = {
  LIVE: 'ecommPortal.settings.razorpayLive',
  TEST: 'ecommPortal.settings.razorpayTest',
  UNKNOWN: 'ecommPortal.settings.razorpayUnknown',
};

/** Test keys take no real money — that is the one worth noticing. */
const MODE_COLORS: StatusColorMap = { LIVE: 'success', TEST: 'warning', UNKNOWN: 'default' };

const accountText = (account: StoreRazorpayAccount, t: Translate) =>
  t('ecommPortal.settings.razorpayOption', { vars: { name: account.name, hint: account.key_hint } });

/** One account as the list shows it: name and key hint, its mode, and whether it is the default or switched off. */
function AccountSummary({ account }: Readonly<{ account: StoreRazorpayAccount }>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
      <Typography variant="body2">{accountText(account, t)}</Typography>
      <StatusChip status={account.mode} label={codeLabel(MODE_KEYS, account.mode, t)} colorMap={MODE_COLORS} variant="outlined" />
      {account.is_default && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('ecommPortal.settings.razorpayDefaultTag')}
        </Typography>
      )}
      {!account.is_active && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('ecommPortal.settings.razorpaySwitchedOff')}
        </Typography>
      )}
    </Stack>
  );
}

interface RazorpayAccountFieldProps<T extends FieldValues> {
  control: Control<T>;
  /** Holds the Tech-portal entry id, or `''` for the Tech portal's default account. */
  name: Path<T>;
}

/**
 * Which of the Tech portal's Razorpay accounts takes the store's online
 * payments. A switched-off account is listed but cannot be picked — the
 * server refuses it.
 */
export default function RazorpayAccountField<T extends FieldValues>({ control, name }: Readonly<RazorpayAccountFieldProps<T>>) {
  const { t } = useTranslation();
  const { data, loading } = useQuery(STORE_RAZORPAY_ACCOUNTS, { fetchPolicy: 'cache-and-network' });
  const accounts = useMemo(() => data?.storeAdminRazorpayAccounts ?? [], [data]);
  const byId = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);

  if (!loading && accounts.length === 0) {
    return (
      <Alert severity="info" data-testid="settings-razorpay-none">
        {t('ecommPortal.settings.razorpayNone')}
      </Alert>
    );
  }
  const renderValue = (value: unknown) => {
    const account = byId.get(String(value));
    return account ? accountText(account, t) : t('ecommPortal.settings.razorpayDefault');
  };
  return (
    <RhfTextField
      control={control}
      name={name}
      label={t('ecommPortal.settings.razorpayAccount')}
      hint={t('ecommPortal.settings.razorpayHint')}
      select
      slotProps={{ select: { displayEmpty: true, renderValue }, inputLabel: { shrink: true } }}
      data-testid="settings-razorpay-account"
    >
      <MenuItem value="">{t('ecommPortal.settings.razorpayDefault')}</MenuItem>
      {accounts.map((account) => (
        <MenuItem key={account.id} value={account.id} disabled={!account.is_active}>
          <AccountSummary account={account} />
        </MenuItem>
      ))}
    </RhfTextField>
  );
}
