import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Skeleton, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useConfirm } from '@duncit/dialogs';
import type { PodChangeRole, PodChangeRow } from '@duncit/utils';
import { useTranslation } from './i18n';
import ChangeRequestCard from './ChangeRequestCard';
import {
  MY_POD_CHANGE_BOARD,
  RESPOND_TO_POD_CHANGE,
  WITHDRAW_POD_CHANGE,
} from './queries';

/** A titled list with its own empty line. Hoisted (S6478). */
function BoardList({
  title,
  subtitle,
  emptyText,
  rows,
  busy,
  onApprove,
  onPass,
  onWithdraw,
}: Readonly<{
  title: string;
  subtitle?: string;
  emptyText: string;
  rows: readonly PodChangeRow[];
  busy: boolean;
  onApprove?: (row: PodChangeRow) => void;
  onPass?: (row: PodChangeRow) => void;
  onWithdraw?: (row: PodChangeRow) => void;
}>) {
  return (
    <Stack spacing={1.25}>
      <Stack>
        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        )}
      </Stack>
      {rows.length === 0 ? (
        <Alert severity="info">{emptyText}</Alert>
      ) : (
        rows.map((row) => (
          <ChangeRequestCard
            key={row.id}
            row={row}
            busy={busy}
            onApprove={onApprove ? () => onApprove(row) : undefined}
            onPass={onPass ? () => onPass(row) : undefined}
            onWithdraw={onWithdraw ? () => onWithdraw(row) : undefined}
          />
        ))
      )}
    </Stack>
  );
}

interface Props {
  /**
   * Narrow the board to ONE role — what a studio section does, so the Venue
   * Studio never shows a host's requests. Omitted, every role is listed, which
   * is what the standalone mWeb page wants.
   */
  role?: PodChangeRole;
  /** Set to drop the heading when the surface draws its own. */
  hideHeader?: boolean;
  /** Told after every successful answer, so a surface can toast + refetch. */
  onChanged?: (message: string) => void;
}

/**
 * The Change Requests section every partner studio renders (rule 40).
 *
 * Two lists over ONE query: what Duncit is asking of you, and what you asked of
 * Duncit. They come back together because they are one screen and because a
 * second query would be a second place to decide whose request is whose — the
 * server already answers that, per role, off the signed-in account.
 */
export default function ChangeRequestBoard({
  role,
  hideHeader = false,
  onChanged,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [errorText, setErrorText] = useState<string | null>(null);
  const board = useQuery<any>(MY_POD_CHANGE_BOARD, { fetchPolicy: 'cache-and-network' });
  const [respond, respondState] = useMutation<any>(RESPOND_TO_POD_CHANGE);
  const [withdraw, withdrawState] = useMutation<any>(WITHDRAW_POD_CHANGE);

  const data = board.data?.myPodChangeBoard;
  const byRole = (rows: PodChangeRow[]) => (role ? rows.filter((r) => r.role === role) : rows);
  const incoming = byRole(data?.incoming ?? []);
  const mine = byRole(data?.mine ?? []);
  const busy = respondState.loading || withdrawState.loading;

  const run = (promise: Promise<unknown>, message: string) => {
    setErrorText(null);
    promise
      .then(() => {
        onChanged?.(message);
        return board.refetch();
      })
      .catch((error: Error) => setErrorText(error.message));
  };

  const approve = (row: PodChangeRow) => {
    run(
      respond({ variables: { request_id: row.id, decision: 'APPROVE', reason: '' } }),
      t('changeRequest.approved')
    );
  };

  const pass = (row: PodChangeRow) => {
    confirm({
      title: t('changeRequest.passTitle'),
      message: t('changeRequest.passBody'),
      confirmLabel: t('changeRequest.pass'),
    })
      .then((ok) => {
        if (ok) {
          run(
            respond({ variables: { request_id: row.id, decision: 'PASS', reason: '' } }),
            t('changeRequest.passed')
          );
        }
        return undefined;
      })
      .catch(() => undefined);
  };

  const pull = (row: PodChangeRow) => {
    confirm({
      title: t('changeRequest.withdrawTitle'),
      message: t('changeRequest.withdrawBody'),
      confirmLabel: t('changeRequest.withdraw'),
      destructive: true,
    })
      .then((ok) => {
        if (ok) {
          run(withdraw({ variables: { request_id: row.id } }), t('changeRequest.withdrawn'));
        }
        return undefined;
      })
      .catch(() => undefined);
  };

  if (board.loading && !data) {
    return <Skeleton variant="rounded" height={180} />;
  }

  if (board.error && !data) {
    return (
      <Alert
        severity="error"
        action={
          <DuncitButton
            color="inherit"
            size="small"
            onClick={() => {
              board.refetch().catch(() => undefined);
            }}
          >
            {t('changeRequest.retry')}
          </DuncitButton>
        }
      >
        {t('changeRequest.loadFailed')}
      </Alert>
    );
  }

  return (
    <Stack spacing={2.5}>
      {!hideHeader && (
        <Stack>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {t('changeRequest.sectionTitle')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('changeRequest.sectionSubtitle')}
          </Typography>
        </Stack>
      )}
      {errorText && <Alert severity="error">{errorText}</Alert>}
      <BoardList
        title={t('changeRequest.incomingTitle')}
        subtitle={t('changeRequest.incomingSubtitle')}
        emptyText={t('changeRequest.incomingEmpty')}
        rows={incoming}
        busy={busy}
        onApprove={approve}
        onPass={pass}
      />
      <BoardList
        title={t('changeRequest.mineTitle')}
        emptyText={t('changeRequest.mineEmpty')}
        rows={mine}
        busy={busy}
        onWithdraw={pull}
      />
    </Stack>
  );
}
