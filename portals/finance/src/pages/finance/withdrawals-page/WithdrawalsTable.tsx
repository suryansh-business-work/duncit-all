import { useMemo, type MutableRefObject } from 'react';
import { DuncitTable, type TableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import type { WithdrawalRow } from './queries';
import { buildWithdrawalColumns } from './withdrawal-columns';

const getWithdrawalRowId = (w: WithdrawalRow) => w.id;

interface Props {
  /** Namespaces the column layout this table persists — never share one. */
  tableId: string;
  /** The pod being drilled into, so Amount can name this pod's slice. */
  podId: string;
  fetchRows: TableFetch<WithdrawalRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  busy: boolean;
  emptyText: string;
  /** Open the Accept / Partially approve / Reject dialog for a row. */
  onReview: (w: WithdrawalRow) => void;
  /** Start a failed or stalled payout again, or ask Razorpay where it stands. */
  onRetry: (w: WithdrawalRow) => void;
}

export default function WithdrawalsTable({
  tableId,
  podId,
  fetchRows,
  refetchRef,
  busy,
  emptyText,
  onReview,
  onRetry,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo(
    () => buildWithdrawalColumns({ t, podId, busy, onReview, onRetry }),
    [t, podId, busy, onReview, onRetry],
  );

  return (
    <DuncitTable<WithdrawalRow>
      ariaLabel={t('finance.withdrawals.title')}
      tableId={tableId}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getWithdrawalRowId}
      emptyText={emptyText}
      defaultSort={{ field: 'requested_at', dir: 'desc' }}
      searchPlaceholder={t('finance.payouts.searchWithdrawals')}
      refetchRef={refetchRef}
    />
  );
}
