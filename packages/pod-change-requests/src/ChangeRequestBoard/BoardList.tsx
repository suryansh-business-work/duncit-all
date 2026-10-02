import { Alert, Stack, Typography } from '@mui/material';
import type { PodChangeRow } from '@duncit/utils';
import ChangeRequestCard from '../ChangeRequestCard';

/** A titled list with its own empty line. Hoisted (S6478). */
export default function BoardList({
  testId,
  title,
  subtitle,
  emptyText,
  rows,
  busy,
  onApprove,
  onPass,
  onWithdraw,
}: Readonly<{
  testId: string;
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
    <Stack data-testid={testId} spacing={1.25}>
      <Stack>
        <Typography data-testid={`${testId}-title`} variant="subtitle1" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        )}
      </Stack>
      {rows.length === 0 ? (
        <Alert data-testid={`${testId}-empty`} severity="info">{emptyText}</Alert>
      ) : (
        rows.map((row) => (
          <ChangeRequestCard
            key={row.id}
            testId={`${testId}-${row.id}`}
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
