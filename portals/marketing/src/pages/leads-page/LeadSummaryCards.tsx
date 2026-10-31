import { useEffect, type RefObject } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Grid, Stack } from '@mui/material';
import { notify } from '@duncit/dialogs';
import { EM_DASH } from '@duncit/table';
import { StatCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { STAGES, STAGE_LABEL } from './copy';
import { MARKETING_LEAD_SUMMARY, type MarketingLeadStage, type MarketingLeadSummary } from './queries';

interface Props {
  /** Hands back a reload, so an action in the drawer refreshes the counts too. */
  refetchRef?: RefObject<(() => void) | null>;
}

const countAt = (summary: MarketingLeadSummary | undefined, stage: MarketingLeadStage) =>
  summary?.stages.find((row) => row.stage === stage)?.count ?? 0;

/** Where the pipeline stands: every lead, then one card per stage; each card pins the list to that stage. */
export default function LeadSummaryCards({ refetchRef }: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const { data, loading, error, refetch } = useQuery<{ marketingLeadSummary: MarketingLeadSummary }>(MARKETING_LEAD_SUMMARY, {
    fetchPolicy: 'cache-and-network',
  });
  const summary = data?.marketingLeadSummary;

  useEffect(() => {
    if (refetchRef) {
      refetchRef.current = () => {
        refetch().catch((err: unknown) => notify(parseApiError(err), 'error'));
      };
    }
  }, [refetchRef, refetch]);

  const cards = [
    { key: 'ALL', label: t('marketing.leads.cardTotal'), value: summary?.total ?? 0, to: '/leads' },
    ...STAGES.map((stage) => ({ key: stage, label: t(STAGE_LABEL[stage]), value: countAt(summary, stage), to: `/leads?stage=${stage}` })),
  ];

  return (
    <Stack spacing={1} data-tour="leads-cards">
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      <Grid container spacing={2} data-testid="lead-summary-cards">
        {cards.map((card) => (
          <Grid key={card.key} size={{ xs: 6, sm: 4, md: 3, lg: 12 / 7 }}>
            <StatCard
              label={card.label}
              value={summary ? card.value.toLocaleString(locale) : EM_DASH}
              to={card.to}
              loading={loading && !summary}
              testId={`lead-card-${card.key}`}
              sx={{ height: '100%' }}
            />
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}
