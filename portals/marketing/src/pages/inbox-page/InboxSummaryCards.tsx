import { useEffect, type RefObject } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Grid, Stack } from '@mui/material';
import { notify } from '@duncit/dialogs';
import { EM_DASH } from '@duncit/table';
import { StatCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { INBOX_CARDS } from './copy';
import { SOCIAL_INBOX_SUMMARY, type SocialInboxSummary } from './queries';

interface Props {
  /** Hands back a reload, so an action in the drawer refreshes the counts too. */
  refetchRef: RefObject<(() => void) | null>;
}

/** What is waiting; each card opens the queue on its slice. */
export default function InboxSummaryCards({ refetchRef }: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const { data, loading, error, refetch } = useQuery<{ socialInboxSummary: SocialInboxSummary }>(SOCIAL_INBOX_SUMMARY, {
    fetchPolicy: 'cache-and-network',
  });
  const summary = data?.socialInboxSummary;

  useEffect(() => {
    refetchRef.current = () => {
      refetch().catch((err: unknown) => notify(parseApiError(err), 'error'));
    };
  }, [refetchRef, refetch]);

  return (
    <Stack spacing={1} data-tour="inbox-cards">
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      <Grid container spacing={2} data-testid="inbox-summary-cards">
        {INBOX_CARDS.map((card) => (
          <Grid key={card.view} size={{ xs: 6, md: 3 }}>
            <StatCard
              label={t(card.label)}
              value={summary ? summary[card.field].toLocaleString(locale) : EM_DASH}
              to={`/social/inbox?view=${card.view}`}
              loading={loading && !summary}
              testId={`inbox-card-${card.view}`}
              sx={{ height: '100%' }}
            />
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
