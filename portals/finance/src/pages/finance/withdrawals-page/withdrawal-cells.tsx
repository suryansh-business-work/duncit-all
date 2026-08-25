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
    <Typography variant="body2" component="span" sx={{
      fontWeight: 700
    }}>
      {w.beneficiary_name}
    </Typography>
    <Typography variant="caption" component="span" sx={{
      color: "text.secondary"
    }}>
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
        <Typography variant="caption" component="span" sx={{
          color: "text.secondary"
        }}>
          {holder}
        </Typography>
      ) : null}
    </Stack>
  );
};

export const renderStatus = (w: WithdrawalRow) => (
  <Stack
    component="span"
    sx={{
      alignItems: "flex-start",
      lineHeight: 1.2
    }}>
    <Chip size="small" color={STATUS_COLOR[w.status] ?? 'default'} label={w.status} />
    {w.reject_reason ? (
      <Typography variant="caption" component="span" sx={{
        color: "text.secondary"
      }}>
        {w.reject_reason}
      </Typography>
    ) : null}
  </Stack>
);

export const withdrawerSearchText = (w: WithdrawalRow) =>
  `${w.beneficiary_name} ${w.beneficiary_email}`.trim() || EM_DASH;

/** This pod's slice of a withdrawal, or null when the whole request was its money. */
export const podShareOf = (w: WithdrawalRow, podId: string): number | null => {
  if (w.allocations.length <= 1) return null;
  const mine = w.allocations.find((a) => a.pod_id === podId);
  return mine ? mine.amount : null;
};

/**
 * Amount — what the withdrawer asked for, which is what gets transferred.
 *
 * On a pod's page that number can be larger than the pod earned: one request
 * draws on whatever the wallet holds, so it can span several pods. The caption
 * names this pod's slice in that case, so a reviewer never reads the full
 * request as money owed by the pod they are looking at. One request is still
 * ONE transfer — Mark Paid releases the whole amount, not the slice.
 */
export const renderAmount = (formatted: string, share: string | null) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="span">
      {formatted}
    </Typography>
    {share ? (
      <Typography variant="caption" component="span" sx={{
        color: "text.secondary"
      }}>
        {`${share} from this pod`}
      </Typography>
    ) : null}
  </Stack>
);
