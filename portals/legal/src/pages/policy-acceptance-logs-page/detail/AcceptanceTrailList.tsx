import { Paper, Stack, Typography } from '@mui/material';
import { policyAcceptanceMethodLabel, useTranslation } from '@duncit/app-settings';
import type { PolicyAcceptance } from '../../../graphql/policyAcceptance';

interface RowProps {
  row: PolicyAcceptance;
  /** The row the dialog was opened on, so it can be told apart from the rest. */
  isCurrent: boolean;
  when: string;
  via: string;
}

/** One earlier acceptance. Hoisted to module scope rather than nested. */
function TrailRow({ row, isCurrent, when, via }: Readonly<RowProps>) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 1.25, borderColor: isCurrent ? 'primary.main' : 'divider' }}
    >
      <Stack direction="row" spacing={1} justifyContent="space-between" flexWrap="wrap" useFlexGap>
        <Typography variant="body2" fontWeight={700}>
          {row.policy_title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {when}
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block">
        {via} · {row.surface}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
      >
        {row.content_hash}
      </Typography>
    </Paper>
  );
}

interface Props {
  heading: string;
  rows: PolicyAcceptance[];
  emptyText: string;
  /** Id of the row the dialog was opened on. */
  currentId: string;
  formatDateTime: (value: string) => string;
  /** Shown when the server capped the list. */
  footnote?: string;
}

/**
 * A list of acceptances as context beside the one being inspected.
 *
 * Used twice with different data — this person's trail through this policy, and
 * everything else they have accepted — because both answer the same shape of
 * question and a second component would be the same list twice (rule 40).
 */
export default function AcceptanceTrailList({
  heading,
  rows,
  emptyText,
  currentId,
  formatDateTime,
  footnote,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" fontWeight={800}>
        {heading}
      </Typography>
      {rows.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {emptyText}
        </Typography>
      )}
      {rows.map((row) => (
        <TrailRow
          key={row.id}
          row={row}
          isCurrent={row.id === currentId}
          when={formatDateTime(row.accepted_at)}
          via={policyAcceptanceMethodLabel(t, row.method)}
        />
      ))}
      {!!footnote && rows.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          {footnote}
        </Typography>
      )}
    </Stack>
  );
}
