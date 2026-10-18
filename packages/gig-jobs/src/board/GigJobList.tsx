import { Alert, Skeleton, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import type { GigJobRow } from '@duncit/utils';
import GigJobCard from './GigJobCard';

interface Props {
  rows: readonly GigJobRow[];
  total: number;
  loading: boolean;
  error: boolean;
  emptyTitle: string;
  emptyHint?: string;
  onRetry: () => void;
  onMore: () => void;
}

/** A page of gigs with its loading, error, empty and "load more" states. */
export default function GigJobList({ rows, total, loading, error, emptyTitle, emptyHint, onRetry, onMore }: Readonly<Props>) {
  const { t } = useTranslation();

  if (error && rows.length === 0) {
    return (
      <Alert
        severity="error"
        action={
          <DuncitButton color="inherit" size="small" onClick={onRetry}>
            {t('gigJobs.board.retry')}
          </DuncitButton>
        }
      >
        {t('gigJobs.board.loadFailed')}
      </Alert>
    );
  }

  if (loading && rows.length === 0) {
    return (
      <Stack spacing={2} aria-busy="true">
        <Skeleton variant="rounded" height={140} />
        <Skeleton variant="rounded" height={140} />
        <Skeleton variant="rounded" height={140} />
      </Stack>
    );
  }

  if (rows.length === 0) {
    return (
      <Stack spacing={0.5} sx={{ py: 4, textAlign: 'center' }} data-testid="gig-list-empty">
        <Typography variant="subtitle1">{emptyTitle}</Typography>
        {emptyHint && (
          <Typography variant="body2" color="text.secondary">
            {emptyHint}
          </Typography>
        )}
      </Stack>
    );
  }

  return (
    <Stack spacing={2} component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
      {rows.map((job) => (
        <li key={job.id}>
          <GigJobCard job={job} />
        </li>
      ))}
      {rows.length < total && (
        <li>
          <DuncitButton fullWidth variant="outlined" onClick={onMore} loading={loading} disabled={loading}>
            {t('gigJobs.board.loadMore')}
          </DuncitButton>
        </li>
      )}
    </Stack>
  );
}
