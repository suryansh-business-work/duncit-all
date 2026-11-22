import { Chip, Stack, Typography } from '@mui/material';
import { EM_DASH } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { accountDetails, accountHolder } from './account-details';
import type { MoneyOutStatus, WithdrawalRow } from './queries';
import { roleLabel, type WithdrawerRole } from './roles';
import { statusLabel } from './status-options';

type ChipColor = 'default' | 'primary' | 'secondary' | 'info' | 'warning' | 'success' | 'error';

const STATUS_COLOR: Record<MoneyOutStatus, ChipColor> = {
  PENDING: 'warning',
  APPROVED: 'info',
  PARTIALLY_APPROVED: 'info',
  PROCESSING: 'info',
  PAID: 'success',
  REJECTED: 'error',
  FAILED: 'error',
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
    color={ROLE_COLOR[w.withdrawer_role]}
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

/** One status chip with its translated label and an optional line of detail underneath. */
function StatusChip({ status, detail }: Readonly<{ status: MoneyOutStatus; detail?: string }>) {
  const { t } = useTranslation();
  return (
    <Stack
      component="span"
      sx={{
        alignItems: "flex-start",
        lineHeight: 1.2
      }}>
      <Chip size="small" color={STATUS_COLOR[status]} label={statusLabel(t, status)} />
      {detail ? (
        <Typography variant="caption" component="span" sx={{
          color: "text.secondary"
        }}>
          {detail}
        </Typography>
      ) : null}
    </Stack>
  );
}

/** Decision — what a Finance Manager decided, and why when there is a reason to read. */
export const renderDecision = (w: WithdrawalRow) => (
  <StatusChip status={w.approval_status} detail={w.decision_reason || w.reject_reason} />
);

/** Payment — what the bank says. Empty until a payout has been started. */
export const renderPayment = (w: WithdrawalRow) =>
  w.payout_status ? <StatusChip status={w.payout_status} detail={w.payout_failure_reason} /> : EM_DASH;

export const withdrawerSearchText = (w: WithdrawalRow) =>
  `${w.beneficiary_name} ${w.beneficiary_email}`.trim() || EM_DASH;

/** This pod's slice of a withdrawal, or null when the whole request was its money. */
export const podShareOf = (w: WithdrawalRow, podId: string): number | null => {
  if (w.allocations.length <= 1) return null;
  const mine = w.allocations.find((a) => a.pod_id === podId);
  return mine ? mine.amount : null;
};

/**
 * Amount — what is being paid: the approved amount once Finance has decided,
 * the requested amount before.
 *
 * The caption says what else the reader needs: after a partial approval, what
 * was originally requested; on a pod's page, this pod's slice of a request that
 * can span several pods. One request is still ONE transfer — approving it
 * releases the whole amount, not the slice.
 */
export const renderAmount = (formatted: string, caption: string | null) => (
  <Stack component="span" sx={{ lineHeight: 1.2 }}>
    <Typography variant="body2" component="span">
      {formatted}
    </Typography>
    {caption ? (
      <Typography variant="caption" component="span" sx={{
        color: "text.secondary"
      }}>
        {caption}
      </Typography>
    ) : null}
  </Stack>
);
