import type { ReactNode } from 'react';
import { Alert, CircularProgress, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  loading: boolean;
  error: string | null;
  /** Rows already on screen. */
  count: number;
  hasMore: boolean;
  emptyText: string;
  onLoadMore: () => void;
  children: ReactNode;
}

/**
 * The states around a "Load more" list, in order: a failed first page, the
 * first page still loading, nothing to show, then the rows with the button
 * that fetches the next page. Every paged club-admin list renders through it.
 */
export default function PagedListBody({
  loading,
  error,
  count,
  hasMore,
  emptyText,
  onLoadMore,
  children,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (error && count === 0) return <Alert severity="error">{error}</Alert>;
  if (loading && count === 0) {
    return (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress size={24} />
      </Stack>
    );
  }
  if (count === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {emptyText}
      </Typography>
    );
  }
  return (
    <Stack spacing={1}>
      {error && <Alert severity="error">{error}</Alert>}
      {children}
      {hasMore && (
        <DuncitButton
          variant="outlined"
          onClick={onLoadMore}
          disabled={loading}
          sx={{ alignSelf: 'center', borderRadius: 999, fontWeight: 700 }}
        >
          {t('mweb.clubStudio.loadMore')}
        </DuncitButton>
      )}
    </Stack>
  );
}
