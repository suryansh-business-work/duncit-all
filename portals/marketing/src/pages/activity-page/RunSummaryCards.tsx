import { useQuery } from '@apollo/client/react';
import { Alert, Grid, Stack } from '@mui/material';
import { EM_DASH } from '@duncit/table';
import { StatCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { MARKETING_RUN_SUMMARY, type MarketingRunSummary } from './queries';

export interface RunSummaryCard {
  key: string;
  label: string;
  /** Which of the summary's numbers this card shows. */
  value: (summary: MarketingRunSummary) => number;
  /** Where the card leads when it is a way into a list. */
  to?: string;
}

/** The headline numbers a page leads with, read once from the run summary. */
export default function RunSummaryCards({ cards }: Readonly<{ cards: readonly RunSummaryCard[] }>) {
  const { locale } = useTranslation();
  const { data, loading, error } = useQuery<{ marketingRunSummary: MarketingRunSummary }>(MARKETING_RUN_SUMMARY, {
    fetchPolicy: 'cache-and-network',
  });
  const summary = data?.marketingRunSummary;

  return (
    <Stack spacing={1}>
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      <Grid container spacing={2} data-testid="run-summary-cards">
        {cards.map((card) => (
          <Grid key={card.key} size={{ xs: 12, sm: 6, md: 4 }}>
            <StatCard
              label={card.label}
              value={summary ? card.value(summary).toLocaleString(locale) : EM_DASH}
              to={card.to}
              loading={loading && !summary}
              testId={`run-card-${card.key}`}
              sx={{ height: '100%' }}
            />
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
