import { Chip, Stack, Typography } from '@mui/material';
import { EM_DASH } from '@duncit/table';
import { accountDetails, accountHolder } from './account-details';
import type { WithdrawalRow } from './queries';
import { roleLabel, type WithdrawerRole } from './roles';

type ChipColor = 'default' | 'primary' | 'secondary' | 'info' | 'warning' | 'success' | 'error';

const STATUS_COLOR: Record<string, ChipColor> = {
  PENDING: 'warning',
  PAID: 'success',
  REJECTED: 'error',
};

const ROLE_COLOR: Record<WithdrawerRole, ChipColor> = {
  HOST: 'primary',
  VENUE_OWNER: 'info',
  ECOMM_MANAGER: 'secondary',
  CLUB_ADMIN: 'default',
};

/** Withdrawer Name — who asked, with the address the payout advice goes to. */
export const renderWithdrawer = (w: WithdrawalRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={700} component="span">
      {w.beneficiary_name}
    </Typography>
    <Typography variant="caption" color="text.secondary" component="span">
      {w.beneficiary_email}
    </Typography>
  </Stack>
);

/** Withdrawal Method — UPI / IMPS / NEFT. */
export const renderMethod = (w: WithdrawalRow) => (
  <Chip size="small" variant="outlined" label={w.payout_method} />
);

/** Role — the capacity stamped on the request, not the user's roles today. */
export const renderRole = (w: WithdrawalRow) => (
  <Chip
    size="small"
    variant="outlined"
    color={ROLE_COLOR[w.withdrawer_role] ?? 'default'}
    label={roleLabel(w.withdrawer_role)}
  />
);

/** Account Details — the payable identifier only, account numbers masked. */
export const renderAccount = (w: WithdrawalRow) => {
  const holder = accountHolder(w);
  return (
    <Stack component="span" sx={{ lineHeight: 1.2 }}>
      <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace' }}>
        {accountDetails(w)}
      </Typography>
      {holder ? (
        <Typography variant="caption" color="text.secondary" component="span">
          {holder}
        </Typography>
      ) : null}
    </Stack>
  );
};

export const renderStatus = (w: WithdrawalRow) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }} alignItems="flex-start">
    <Chip size="small" color={STATUS_COLOR[w.status] ?? 'default'} label={w.status} />
    {w.reject_reason ? (
      <Typography variant="caption" color="text.secondary" component="span">
        {w.reject_reason}
      </Typography>
    ) : null}
  </Stack>
);

export const withdrawerSearchText = (w: WithdrawalRow) =>
  `${w.beneficiary_name} ${w.beneficiary_email}`.trim() || EM_DASH;
